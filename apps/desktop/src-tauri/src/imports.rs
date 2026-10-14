//! Native selection authorizes source reads; only generated managed copies become assets.
use crate::personal::{check_id, id, now, FwError, FwResult, Library};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs::{self, File, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    os::unix::fs::{MetadataExt, OpenOptionsExt},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Condvar, Mutex,
    },
};
const MAX_FILES: usize = 20;
const MAX_BYTES: u64 = 5 * 1024 * 1024 * 1024;
const RESERVE: u64 = 64 * 1024 * 1024;
const CHUNK: usize = 1024 * 1024;
const TTL: i64 = 10 * 60 * 1000;
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedFile {
    pub filename: String,
    pub byte_size: u64,
}
#[derive(Clone, Serialize)]
pub struct Selection {
    pub token: Option<String>,
    pub files: Vec<SelectedFile>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub filename: String,
    pub state: String,
    pub bytes_copied: u64,
    pub total_bytes: u64,
    pub asset_id: Option<String>,
    pub archived: Option<bool>,
    pub error: Option<FwError>,
}
#[derive(Debug, Clone, Serialize)]
pub struct Batch {
    pub id: String,
    pub active: bool,
    pub items: Vec<Item>,
}
#[derive(Clone, Debug)]
struct Fingerprint {
    len: u64,
    dev: u64,
    ino: u64,
    mtime: i64,
    nanos: i64,
}
impl Fingerprint {
    fn of(m: &fs::Metadata) -> Self {
        Self {
            len: m.len(),
            dev: m.dev(),
            ino: m.ino(),
            mtime: m.mtime(),
            nanos: m.mtime_nsec(),
        }
    }
    fn matches(&self, m: &fs::Metadata) -> bool {
        self.len == m.len()
            && self.dev == m.dev()
            && self.ino == m.ino()
            && self.mtime == m.mtime()
            && self.nanos == m.mtime_nsec()
    }
}
#[derive(Clone)]
struct Source {
    path: PathBuf,
    filename: String,
    fingerprint: Option<Fingerprint>,
}
struct NativeSelection {
    token: String,
    expires: i64,
    sources: Vec<Source>,
}
#[derive(Default)]
struct Runtime {
    selection: Option<NativeSelection>,
    consumed: HashMap<String, String>,
    active: Option<String>,
    last: Option<String>,
    cancelled: HashSet<String>,
    cancel_all: bool,
    errors: HashMap<String, FwError>,
}
pub struct Imports {
    pub lib: Arc<Library>,
    runtime: Mutex<Runtime>,
    idle: Condvar,
    pub selecting: AtomicBool,
    closing: AtomicBool,
}
#[derive(Clone)]
struct Attempt {
    id: String,
    candidate: String,
    filename: String,
    title: String,
    stage: String,
    target: String,
    state: String,
    hash: Option<String>,
    size: u64,
}
impl Imports {
    pub fn new(lib: Arc<Library>) -> FwResult<Self> {
        let service = Self {
            lib,
            runtime: Mutex::new(Runtime::default()),
            idle: Condvar::new(),
            selecting: AtomicBool::new(false),
            closing: AtomicBool::new(false),
        };
        service.recover()?;
        Ok(service)
    }
    pub fn available(&self) -> FwResult<()> {
        if self.closing.load(Ordering::SeqCst) {
            return Err(FwError::new("IMPORT_BUSY", "正在安全退出，请稍候。"));
        }
        if self.runtime.lock().unwrap().active.is_some() {
            return Err(FwError::new(
                "IMPORT_BUSY",
                "当前已有导入，完成或取消后再选择。",
            ));
        }
        Ok(())
    }
    // Called ONLY with native chooser results, never with a path from IPC.
    pub(crate) fn selected(&self, paths: Vec<PathBuf>) -> FwResult<Selection> {
        self.available()?;
        if paths.is_empty() {
            return Ok(Selection {
                token: None,
                files: vec![],
            });
        }
        if paths.len() > MAX_FILES {
            return Err(FwError::new(
                "LIMIT_EXCEEDED",
                "一次最多选择20个文件，请重新选择。",
            ));
        }
        let sources: Vec<Source> = paths
            .into_iter()
            .map(|p| {
                let m = fs::symlink_metadata(&p).ok();
                let fingerprint = m
                    .as_ref()
                    .filter(|m| m.is_file() && !m.file_type().is_symlink())
                    .map(Fingerprint::of);
                Source {
                    filename: p
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    path: p,
                    fingerprint,
                }
            })
            .collect();
        let files = sources
            .iter()
            .map(|s| SelectedFile {
                filename: s.filename.clone(),
                byte_size: s.fingerprint.as_ref().map(|f| f.len).unwrap_or(0),
            })
            .collect();
        let token = id();
        self.runtime.lock().unwrap().selection = Some(NativeSelection {
            token: token.clone(),
            expires: now() + TTL,
            sources,
        });
        Ok(Selection {
            token: Some(token),
            files,
        })
    }
    pub fn start(
        self: &Arc<Self>,
        token: &str,
        notify: Arc<dyn Fn(&str) + Send + Sync>,
    ) -> FwResult<Batch> {
        check_id(token)
            .map_err(|_| FwError::new("SELECTION_EXPIRED", "选择授权无效，请重新选择视频。"))?;
        let mut rt = self.runtime.lock().unwrap();
        if let Some(batch) = rt.consumed.get(token).cloned() {
            drop(rt);
            return self
                .batch(Some(&batch))?
                .ok_or_else(|| FwError::new("IO_FAILED", "导入结果不存在。"));
        }
        if self.closing.load(Ordering::SeqCst) || rt.active.is_some() {
            return Err(FwError::new("IMPORT_BUSY", "当前已有导入或正在退出。"));
        }
        let s = rt
            .selection
            .as_ref()
            .filter(|s| s.token == token && s.expires >= now())
            .ok_or_else(|| FwError::new("SELECTION_EXPIRED", "选择授权已过期，请重新选择。"))?;
        let batch = id();
        let sources = s.sources.clone();
        let attempts: Vec<Attempt> = sources
            .iter()
            .map(|s| {
                let aid = id();
                let candidate = id();
                let ext = s
                    .path
                    .extension()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_lowercase();
                let ext = if ext == "mov" { "mov" } else { "mp4" };
                let mut title = s
                    .path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .trim()
                    .chars()
                    .take(200)
                    .collect::<String>();
                if title.is_empty() {
                    title = "本地视频".into();
                }
                Attempt {
                    id: aid.clone(),
                    candidate: candidate.clone(),
                    filename: s.filename.clone(),
                    title,
                    stage: format!("staging/{aid}.part"),
                    target: format!("media/originals/{candidate}.{ext}"),
                    state: "queued".into(),
                    hash: None,
                    size: 0,
                }
            })
            .collect();
        {
            let mut db = self.lib.conn()?;
            let tx = db.transaction()?;
            for (a, s) in attempts.iter().zip(&sources) {
                tx.execute("INSERT INTO import_attempts(id,batch_id,candidate_id,original_filename,title,stage_relpath,target_relpath,state,total_bytes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,'queued',?8,?9,?9)",params![a.id,batch,a.candidate,a.filename,a.title,a.stage,a.target,s.fingerprint.as_ref().map(|f|f.len).unwrap_or(0),now()])?;
            }
            tx.commit()?;
        }
        rt.selection = None;
        rt.consumed.insert(token.into(), batch.clone());
        rt.active = Some(batch.clone());
        rt.last = Some(batch.clone());
        rt.cancelled.clear();
        rt.cancel_all = false;
        if rt.consumed.len() > 32 {
            rt.consumed.retain(|k, _| k == token);
        }
        drop(rt);
        let worker = self.clone();
        std::thread::spawn(move || {
            for (a, s) in attempts.into_iter().zip(sources) {
                let result = worker.copy_one(&a, &s, &notify);
                if let Err(e) = result {
                    worker
                        .runtime
                        .lock()
                        .unwrap()
                        .errors
                        .insert(a.id.clone(), e.clone());
                    // Keep committing/staged attempts intact for startup reconciliation.
                    let persisted = worker.attempt(&a.id);
                    if let Ok(p) = persisted {
                        if !matches!(p.state.as_str(), "committing" | "staged") {
                            let cancelled = e.code == "CANCELLED";
                            let cleanup = worker.clean_stage(&p.stage);
                            let state = if cleanup.is_err() {
                                "needs_review"
                            } else if cancelled {
                                "cancelled"
                            } else {
                                "failed"
                            };
                            let error = cleanup.err().unwrap_or(e);
                            let _ = worker.set_state(&a.id, state, Some(&error));
                        } else {
                            let _ = worker.set_state(&a.id, "needs_review", Some(&e));
                        }
                    }
                }
                notify(&a.id);
            }
            let mut rt = worker.runtime.lock().unwrap();
            rt.active = None;
            worker.idle.notify_all();
            drop(rt);
            notify("");
        });
        self.batch(Some(&batch))?
            .ok_or_else(|| FwError::new("IO_FAILED", "无法读取已创建的导入批次。"))
    }
    pub fn batch(&self, batch_id: Option<&str>) -> FwResult<Option<Batch>> {
        let (active, errors) = {
            let rt = self.runtime.lock().unwrap();
            (rt.active.clone(), rt.errors.clone())
        };
        let db = self.lib.conn()?;
        let batch = match batch_id {
            Some(s) => {
                check_id(s)?;
                Some(s.to_string())
            }
            None => db
                .query_row(
                    "SELECT batch_id FROM import_attempts ORDER BY created_at DESC,id DESC LIMIT 1",
                    [],
                    |r| r.get(0),
                )
                .optional()?,
        };
        let Some(batch) = batch else {
            return Ok(None);
        };
        let mut st=db.prepare("SELECT a.id,a.original_filename,a.state,a.bytes_copied,a.total_bytes,a.asset_id,s.archived_at,a.error_json FROM import_attempts a LEFT JOIN assets s ON s.id=a.asset_id WHERE a.batch_id=?1 ORDER BY a.created_at,a.rowid")?;
        let mut items = st
            .query_map([&batch], |r| {
                let error: Option<String> = r.get(7)?;
                Ok(Item {
                    id: r.get(0)?,
                    filename: r.get(1)?,
                    state: r.get(2)?,
                    bytes_copied: r.get(3)?,
                    total_bytes: r.get(4)?,
                    asset_id: r.get(5)?,
                    archived: Some(r.get::<_, Option<i64>>(6)?.is_some()),
                    error: error.and_then(|s| serde_json::from_str(&s).ok()),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for item in &mut items {
            if item.error.is_none() {
                item.error = errors.get(&item.id).cloned();
            }
        }
        if items.is_empty() {
            return Err(FwError::new("VALIDATION_FAILED", "导入批次不存在。"));
        }
        Ok(Some(Batch {
            id: batch.clone(),
            active: active.as_deref() == Some(&batch),
            items,
        }))
    }
    pub fn cancel(&self, batch_id: &str, attempt: Option<&str>) -> FwResult<()> {
        check_id(batch_id)?;
        if let Some(a) = attempt {
            check_id(a)?;
            let db = self.lib.conn()?;
            let exists: bool = db.query_row(
                "SELECT EXISTS(SELECT 1 FROM import_attempts WHERE id=?1 AND batch_id=?2)",
                params![a, batch_id],
                |r| r.get(0),
            )?;
            if !exists {
                return Err(FwError::new("VALIDATION_FAILED", "导入项不属于当前批次。"));
            }
        }
        let mut rt = self.runtime.lock().unwrap();
        if rt.active.as_deref() != Some(batch_id) {
            return Ok(());
        }
        if let Some(a) = attempt {
            rt.cancelled.insert(a.into());
        } else {
            rt.cancel_all = true;
        }
        Ok(())
    }
    pub fn shutdown(&self) {
        self.closing.store(true, Ordering::SeqCst);
        let mut rt = self.runtime.lock().unwrap();
        rt.cancel_all = true;
        rt.selection = None;
        while rt.active.is_some() {
            rt = self.idle.wait(rt).unwrap();
        }
    }
    fn cancelled(&self, attempt: &str) -> bool {
        let rt = self.runtime.lock().unwrap();
        rt.cancel_all || rt.cancelled.contains(attempt)
    }
    fn set_state(&self, a: &str, state: &str, error: Option<&FwError>) -> FwResult<()> {
        let db = self.lib.conn()?;
        db.execute(
            "UPDATE import_attempts SET state=?1,error_json=?2,updated_at=?3 WHERE id=?4",
            params![
                state,
                error.map(|e| serde_json::to_string(e).unwrap()),
                now(),
                a
            ],
        )?;
        Ok(())
    }
    fn progress(&self, a: &str, n: u64, total: u64) -> FwResult<()> {
        self.lib.conn()?.execute(
            "UPDATE import_attempts SET bytes_copied=?1,total_bytes=?2,updated_at=?3 WHERE id=?4",
            params![n, total, now(), a],
        )?;
        Ok(())
    }
    fn check_cancel(&self, a: &str) -> FwResult<()> {
        if self.cancelled(a) {
            Err(FwError::new(
                "CANCELLED",
                "已取消尚未完成的导入，源文件没有改动。",
            ))
        } else {
            Ok(())
        }
    }
    fn copy_one(
        &self,
        a: &Attempt,
        s: &Source,
        notify: &Arc<dyn Fn(&str) + Send + Sync>,
    ) -> FwResult<()> {
        self.check_cancel(&a.id)?;
        let ext = s
            .path
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();
        if !matches!(ext.as_str(), "mp4" | "mov") {
            return Err(FwError::new(
                "VALIDATION_FAILED",
                "仅接收 MP4/MOV 候选；编码能否播放需实际加载。",
            ));
        }
        let m = fs::symlink_metadata(&s.path)?;
        if m.file_type().is_symlink() || !m.is_file() {
            return Err(FwError::new(
                "ACCESS_DENIED",
                "只能导入原生选择的普通文件；不接收目录或符号链接。",
            ));
        }
        let fingerprint = s
            .fingerprint
            .as_ref()
            .ok_or_else(|| FwError::new("ACCESS_DENIED", "所选文件属性无效，请重新选择。"))?;
        if !fingerprint.matches(&m) {
            return Err(FwError::new(
                "SOURCE_CHANGED",
                "选择后源文件发生变化，请重新选择。",
            ));
        }
        if m.len() == 0 {
            return Err(FwError::new("VALIDATION_FAILED", "文件为空，不能入库。"));
        }
        if m.len() > MAX_BYTES {
            return Err(FwError::new(
                "LIMIT_EXCEEDED",
                "单文件最多5 GiB，这是本版产品阈值。",
            ));
        }
        ensure_space(fs2::available_space(&self.lib.root)?, m.len())?;
        let mut input = OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
            .open(&s.path)?;
        if !fingerprint.matches(&input.metadata()?) {
            return Err(FwError::new("SOURCE_CHANGED", "源文件被替换，请重新选择。"));
        }
        let mut header = [0u8; 64];
        let n = input.read(&mut header)?;
        if !media_header(&header[..n]) {
            return Err(FwError::new(
                "VALIDATION_FAILED",
                "文件头不像 MP4/MOV，已拒绝伪装文件。",
            ));
        }
        input.seek(SeekFrom::Start(0))?;
        let stage = self.lib.controlled_path(&a.stage, "staging")?;
        let mut output = OpenOptions::new()
            .write(true)
            .create_new(true)
            .custom_flags(libc::O_NOFOLLOW)
            .open(&stage)?;
        self.set_state(&a.id, "copying", None)?;
        notify(&a.id);
        let mut buf = vec![0u8; CHUNK];
        let mut hash = Sha256::new();
        let mut bytes = 0u64;
        loop {
            self.check_cancel(&a.id)?;
            let n = input.read(&mut buf)?;
            if n == 0 {
                break;
            }
            bytes += n as u64;
            if bytes > fingerprint.len || bytes > MAX_BYTES {
                return Err(FwError::new("SOURCE_CHANGED", "复制期间源文件大小改变。"));
            }
            output.write_all(&buf[..n])?;
            hash.update(&buf[..n]);
            self.progress(&a.id, bytes, fingerprint.len)?;
            notify(&a.id);
        }
        self.set_state(&a.id, "validating", None)?;
        notify(&a.id);
        output.sync_all()?;
        drop(output);
        if bytes != fingerprint.len
            || !fingerprint.matches(&input.metadata()?)
            || !fingerprint.matches(&fs::symlink_metadata(&s.path)?)
        {
            return Err(FwError::new(
                "SOURCE_CHANGED",
                "复制期间源文件发生变化，未确认入库。",
            ));
        }
        self.check_cancel(&a.id)?;
        let digest = format!("{:x}", hash.finalize());
        // Persist recovery evidence before file publication, but release the SQL lock before filesystem work.
        self.lib.conn()?.execute("UPDATE import_attempts SET state='staged',sha256=?1,total_bytes=?2,bytes_copied=?2,updated_at=?3 WHERE id=?4",params![digest,bytes,now(),a.id])?;
        self.finish(&self.attempt(&a.id)?)?;
        notify(&a.id);
        Ok(())
    }
    fn attempt(&self, a: &str) -> FwResult<Attempt> {
        Ok(self.lib.conn()?.query_row("SELECT id,candidate_id,original_filename,title,stage_relpath,target_relpath,state,sha256,total_bytes FROM import_attempts WHERE id=?1",[a],|r|Ok(Attempt{id:r.get(0)?,candidate:r.get(1)?,filename:r.get(2)?,title:r.get(3)?,stage:r.get(4)?,target:r.get(5)?,state:r.get(6)?,hash:r.get(7)?,size:r.get(8)?}))?)
    }
    fn finish(&self, a: &Attempt) -> FwResult<()> {
        let hash = a
            .hash
            .as_ref()
            .filter(|s| s.len() == 64 && s.chars().all(|c| c.is_ascii_hexdigit()))
            .ok_or_else(|| FwError::new("IO_FAILED", "缺少可靠摘要；保留文件供检查。"))?;
        if a.size == 0 || a.size > MAX_BYTES {
            return Err(FwError::new("VALIDATION_FAILED", "恢复记录的字节数无效。"));
        }
        let existing: Option<String> = self
            .lib
            .conn()?
            .query_row("SELECT id FROM assets WHERE sha256=?1", [hash], |r| {
                r.get(0)
            })
            .optional()?;
        let stage = self.lib.controlled_path(&a.stage, "staging")?;
        let (asset_id, target, result) = if let Some(existing) = existing {
            let old = self.lib.get(&existing)?;
            match self.lib.managed_file(&old.managed_relpath) {
                Ok(path) => {
                    // Never overwrite an existing file, including a manually replaced file.
                    if digest_file_checked(&path)? != (old.sha256.clone(), old.byte_size) {
                        return Err(FwError::new(
                            "ACCESS_DENIED",
                            "既有副本大小异常，保留原文件供检查。",
                        ));
                    }
                    let terminal = if a.state == "committing" && a.candidate == existing {
                        "repaired"
                    } else {
                        "duplicate"
                    };
                    self.lib.conn()?.execute("UPDATE import_attempts SET state=?1,asset_id=?2,error_json=NULL,updated_at=?3 WHERE id=?4",params![terminal,existing,now(),a.id])?;
                    self.clean_stage(&a.stage)?;
                    return Ok(());
                }
                Err(e) if e.code == "MANAGED_FILE_MISSING" => {
                    (old.id, old.managed_relpath, "repaired")
                }
                Err(e) => return Err(e),
            }
        } else {
            (a.candidate.clone(), a.target.clone(), "imported")
        };
        check_id(&asset_id)?;
        let final_path = self.lib.controlled_path(&target, "media/originals")?;
        // Record the SAME asset id for missing-copy repair before publication.
        self.lib.conn()?.execute("UPDATE import_attempts SET candidate_id=?1,target_relpath=?2,state='committing',updated_at=?3 WHERE id=?4",params![asset_id,target,now(),a.id])?;
        let final_exists = fs::symlink_metadata(&final_path).is_ok();
        if final_exists {
            // Recovery may encounter our published file. Only a committing record can establish ownership.
            if a.state != "committing"
                || digest_file(&self.lib.managed_file(&target)?)? != (hash.clone(), a.size)
            {
                return Err(FwError::new(
                    "ACCESS_DENIED",
                    "正式目标已存在且归属未确认；没有覆盖，需检查。",
                ));
            }
        } else {
            if digest_file_checked(&stage)? != (hash.clone(), a.size) {
                return Err(FwError::new(
                    "IO_FAILED",
                    "暂存校验不一致；保留文件供检查。",
                ));
            }
            fs::hard_link(&stage, &final_path)?; // Atomic no-clobber publication on the same data filesystem.
            File::open(final_path.parent().unwrap())?.sync_all()?;
        }
        {
            let mut db = self.lib.conn()?;
            let tx = db.transaction()?;
            if result == "imported" {
                tx.execute("INSERT INTO assets(id,title,original_filename,managed_relpath,sha256,byte_size,imported_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?7)",params![asset_id,a.title,a.filename,target,hash,a.size,now()])?;
            }
            tx.execute("UPDATE import_attempts SET state=?1,asset_id=?2,error_json=NULL,updated_at=?3 WHERE id=?4",params![result,asset_id,now(),a.id])?;
            tx.commit()?;
        }
        self.clean_stage(&a.stage)?;
        Ok(())
    }
    fn clean_stage(&self, relative: &str) -> FwResult<()> {
        let p = self.lib.controlled_path(relative, "staging")?;
        match fs::symlink_metadata(&p) {
            Ok(m) => {
                if m.file_type().is_symlink() || !m.is_file() {
                    return Err(FwError::new(
                        "ACCESS_DENIED",
                        "暂存文件归属异常，保留供检查。",
                    ));
                }
                fs::remove_file(&p)?;
                File::open(p.parent().unwrap())?.sync_all()?;
                Ok(())
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.into()),
        }
    }
    fn recover(&self) -> FwResult<()> {
        let ids = {
            let db = self.lib.conn()?;
            let mut st=db.prepare("SELECT id FROM import_attempts WHERE state NOT IN ('imported','duplicate','repaired','failed','cancelled','interrupted','needs_review')")?;
            let v = st
                .query_map([], |r| r.get(0))?
                .collect::<Result<Vec<String>, _>>()?;
            v
        };
        for aid in ids {
            let a = self.attempt(&aid)?;
            if matches!(a.state.as_str(), "staged" | "committing") {
                if let Err(e) = self.finish(&a) {
                    self.set_state(&aid, "needs_review", Some(&e))?;
                }
            } else {
                match self.clean_stage(&a.stage) {
                    Ok(()) => self.set_state(
                        &aid,
                        "interrupted",
                        Some(&FwError::new(
                            "INTERRUPTED",
                            "上次导入已中断，请重新选择源文件。",
                        )),
                    )?,
                    Err(e) => self.set_state(&aid, "needs_review", Some(&e))?,
                }
            }
        }
        // Completed commit before UI acknowledgement: keep the success, only remove OWN known .part.
        let completed = {
            let db = self.lib.conn()?;
            let mut st=db.prepare("SELECT stage_relpath FROM import_attempts WHERE state IN ('imported','duplicate','repaired')")?;
            let v = st
                .query_map([], |r| r.get(0))?
                .collect::<Result<Vec<String>, _>>()?;
            v
        };
        for p in completed {
            if self.clean_stage(&p).is_err() {
                *self.lib.warnings.lock().unwrap() += 1;
            }
        }
        let db = self.lib.conn()?;
        let review: usize = db.query_row(
            "SELECT COUNT(*) FROM import_attempts WHERE state='needs_review'",
            [],
            |r| r.get(0),
        )?;
        let mut known = HashSet::new();
        {
            let mut st=db.prepare("SELECT managed_relpath FROM assets UNION SELECT target_relpath FROM import_attempts WHERE state IN ('staged','committing','needs_review')")?;
            for rel in st.query_map([], |r| r.get::<_, String>(0))? {
                known.insert(rel?);
            }
        }
        let unknown = fs::read_dir(self.lib.root.join("media/originals"))?
            .filter_map(Result::ok)
            .filter(|e| {
                !known.contains(&format!(
                    "media/originals/{}",
                    e.file_name().to_string_lossy()
                ))
            })
            .count();
        *self.lib.warnings.lock().unwrap() += review + unknown;
        Ok(())
    }
}
fn ensure_space(available: u64, bytes: u64) -> FwResult<()> {
    if available < bytes.saturating_add(RESERVE) {
        Err(FwError::new(
            "DISK_FULL",
            "可用空间不足，需容纳管理副本并预留64 MiB。",
        ))
    } else {
        Ok(())
    }
}
fn media_header(b: &[u8]) -> bool {
    b.len() >= 16
        && &b[4..8] == b"ftyp"
        && u32::from_be_bytes(b[..4].try_into().unwrap()) >= 16
        && b[8..].chunks(4).any(|brand| {
            matches!(
                brand,
                b"isom" | b"iso2" | b"mp41" | b"mp42" | b"avc1" | b"qt  " | b"M4V "
            )
        })
}
fn digest_file_checked(p: &Path) -> FwResult<(String, u64)> {
    let m = fs::symlink_metadata(p)?;
    if !m.is_file() || m.file_type().is_symlink() {
        return Err(FwError::new("ACCESS_DENIED", "校验文件不是普通文件。"));
    }
    digest_file(p)
}
fn digest_file(p: &Path) -> FwResult<(String, u64)> {
    let mut f = OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
        .open(p)?;
    let mut h = Sha256::new();
    let mut b = vec![0; CHUNK];
    let mut size = 0;
    loop {
        let n = f.read(&mut b)?;
        if n == 0 {
            break;
        }
        size += n as u64;
        if size > MAX_BYTES {
            return Err(FwError::new("LIMIT_EXCEEDED", "校验文件超出上限。"));
        }
        h.update(&b[..n]);
    }
    Ok((format!("{:x}", h.finalize()), size))
}

#[cfg(test)]
#[path = "import_tests.rs"]
mod tests;
