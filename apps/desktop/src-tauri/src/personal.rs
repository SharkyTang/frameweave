//! D3 personal metadata. No demo, source paths, scripts, notes or media bytes in SQLite.
use fs2::FileExt;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

pub type FwResult<T> = Result<T, FwError>;
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FwError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
}
impl FwError {
    pub fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            retryable: !matches!(
                code,
                "VALIDATION_FAILED" | "SCHEMA_TOO_NEW" | "ACCESS_DENIED" | "LIMIT_EXCEEDED"
            ),
        }
    }
}
impl From<rusqlite::Error> for FwError {
    fn from(e: rusqlite::Error) -> Self {
        let code = match &e {
            rusqlite::Error::SqliteFailure(err, _) => match err.code {
                rusqlite::ErrorCode::DatabaseBusy | rusqlite::ErrorCode::DatabaseLocked => {
                    "DB_BUSY"
                }
                rusqlite::ErrorCode::ReadOnly => "DB_READ_ONLY",
                rusqlite::ErrorCode::DiskFull => "DISK_FULL",
                rusqlite::ErrorCode::DatabaseCorrupt | rusqlite::ErrorCode::NotADatabase => {
                    "DB_CORRUPT"
                }
                _ => "DB_WRITE_FAILED",
            },
            _ => "DB_WRITE_FAILED",
        };
        Self::new(
            code,
            "资料库操作失败；原数据已保留，请检查空间与权限后重试。",
        )
    }
}
impl From<std::io::Error> for FwError {
    fn from(e: std::io::Error) -> Self {
        let (code, message) = match e.raw_os_error() {
            Some(libc::ENOSPC) => ("DISK_FULL", "磁盘空间不足；源文件没有改动。"),
            _ if e.kind() == std::io::ErrorKind::PermissionDenied => {
                ("ACCESS_DENIED", "文件不可读写；请检查权限并重新选择。")
            }
            _ => ("IO_FAILED", "文件操作失败；源文件没有改动，请重试。"),
        };
        Self::new(code, message)
    }
}
pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
pub fn id() -> String {
    Uuid::new_v4().to_string()
}
pub fn check_id(value: &str) -> FwResult<()> {
    if Uuid::parse_str(value)
        .map(|u| u.to_string() == value)
        .unwrap_or(false)
    {
        Ok(())
    } else {
        Err(FwError::new("VALIDATION_FAILED", "无效的素材或导入标识。"))
    }
}
fn text(value: &str, max: usize, required: bool) -> FwResult<String> {
    let s = value.trim();
    if (required && s.is_empty()) || s.chars().count() > max || s.contains('\0') {
        return Err(FwError::new(
            "VALIDATION_FAILED",
            "字段为空或过长；标题最多200字，标签最多20个、每个40字，备注与目标最多4000字。",
        ));
    }
    Ok(s.into())
}
fn tags(values: &[String]) -> FwResult<Vec<String>> {
    if values.len() > 20 {
        return Err(FwError::new("VALIDATION_FAILED", "标签最多20个。"));
    }
    let mut result: Vec<String> = Vec::new();
    for value in values {
        let t = text(value, 40, false)?;
        if !t.is_empty() && !result.iter().any(|v| v.to_lowercase() == t.to_lowercase()) {
            result.push(t);
        }
    }
    Ok(result)
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: String,
    pub title: String,
    pub author: String,
    pub description: String,
    pub learning_goal: String,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub archived: bool,
    pub status: String,
    pub source: String,
    pub poster: String,
    pub revision: i64,
    pub original_filename: String,
    pub byte_size: u64,
    pub sha256: String,
    pub imported_at: i64,
    pub updated_at: i64,
    pub archived_at: Option<i64>,
    pub duration_ms: Option<i64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub playback_status: String,
    #[serde(skip)]
    pub managed_relpath: String,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AssetPatch {
    pub id: String,
    pub expected_revision: i64,
    pub title: String,
    pub description: String,
    pub learning_goal: String,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub archived: bool,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Metadata {
    pub id: String,
    pub content_hash: String,
    pub playback_token: String,
    pub duration_ms: f64,
    pub width: u32,
    pub height: u32,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryInfo {
    pub isolated_probe: bool,
    pub ready: bool,
    pub schema_version: u32,
    pub journal_mode: String,
    pub recovery_warnings: usize,
    pub max_files: usize,
    pub max_file_bytes: u64,
}

pub struct Library {
    pub root: PathBuf,
    pub(crate) db: Mutex<Connection>,
    _owner: File,
    pub(crate) warnings: Mutex<usize>,
}
impl Library {
    pub fn open(root: &Path) -> FwResult<Self> {
        fs::create_dir_all(root)?;
        let root = root.canonicalize()?;
        for rel in ["data", "media", "media/originals", "staging", "recovery"] {
            let p = root.join(rel);
            if let Ok(m) = fs::symlink_metadata(&p) {
                if m.file_type().is_symlink() || !m.is_dir() {
                    return Err(FwError::new(
                        "ACCESS_DENIED",
                        "资料目录包含异常链接，保留原数据，停止初始化。",
                    ));
                }
            }
            fs::create_dir_all(&p)?;
        }
        let lockpath = root.join("data/library.lock");
        reject_link(&lockpath)?;
        let owner = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(&lockpath)?;
        owner
            .try_lock_exclusive()
            .map_err(|_| FwError::new("DB_BUSY", "另一实例正在使用资料库，请先关闭它。"))?;
        let path = root.join("data/frameweave.sqlite3");
        for p in [
            &path,
            &path.with_extension("sqlite3-journal"),
            &path.with_extension("sqlite3-wal"),
            &path.with_extension("sqlite3-shm"),
        ] {
            reject_link(p)?;
        }
        let mut db = Connection::open(&path)?;
        db.busy_timeout(Duration::from_secs(5))?;
        db.pragma_update(None, "foreign_keys", "ON")?;
        let version: i64 = db.pragma_query_value(None, "user_version", |r| r.get(0))?;
        if version > 1 {
            return Err(FwError::new(
                "SCHEMA_TOO_NEW",
                "资料库版本高于本应用；已保留数据，请使用相应版本。",
            ));
        }
        let integrity: String = db.query_row("PRAGMA quick_check", [], |r| r.get(0))?;
        if integrity != "ok" {
            return Err(FwError::new(
                "DB_CORRUPT",
                "资料库校验失败，已保留原库；不自动重建。",
            ));
        }
        // Snapshot BEFORE any migration/journal change. SQLite Backup includes a live WAL consistently.
        if path.metadata()?.len() > 0 && version == 0 {
            let snap = root.join(format!("recovery/pre-migration-{}.sqlite3", id()));
            db.backup("main", &snap, None)?;
        }
        db.pragma_update(None, "journal_mode", "DELETE")?;
        db.pragma_update(None, "synchronous", "FULL")?;
        if version == 0 {
            let tx = db.transaction()?;
            tx.execute_batch(include_str!("schema_v1.sql"))?;
            tx.commit()?;
        }
        let lib = Self {
            root,
            db: Mutex::new(db),
            _owner: owner,
            warnings: Mutex::new(0),
        };
        Ok(lib)
    }
    pub fn conn(&self) -> FwResult<MutexGuard<'_, Connection>> {
        self.db
            .lock()
            .map_err(|_| FwError::new("DB_INIT_FAILED", "资料库状态异常，请重新启动。"))
    }
    pub fn info(&self) -> FwResult<LibraryInfo> {
        let db = self.conn()?;
        Ok(LibraryInfo {
            isolated_probe: std::env::var("FRAMEWEAVE_TEST_NATIVE_PROBE").as_deref() == Ok("1")
                && self.root.parent() == Some(Path::new("/private/tmp")),
            ready: true,
            schema_version: db.pragma_query_value(None, "user_version", |r| r.get(0))?,
            journal_mode: db.pragma_query_value(None, "journal_mode", |r| r.get(0))?,
            recovery_warnings: *self.warnings.lock().unwrap(),
            max_files: 20,
            max_file_bytes: 5 * 1024 * 1024 * 1024,
        })
    }
    pub fn get(&self, asset_id: &str) -> FwResult<Asset> {
        check_id(asset_id)?;
        self.get_db(&*self.conn()?, asset_id)
    }
    pub(crate) fn get_db(&self, db: &Connection, asset_id: &str) -> FwResult<Asset> {
        let mut a = db.query_row("SELECT id,title,description,learning_goal,original_filename,managed_relpath,sha256,byte_size,favorite,archived_at,revision,imported_at,updated_at,duration_ms,width,height,playback_status FROM assets WHERE id=?1", [asset_id], |r| {
            Ok(Asset { id:r.get(0)?, title:r.get(1)?, description:r.get(2)?, learning_goal:r.get(3)?, original_filename:r.get(4)?, managed_relpath:r.get(5)?, sha256:r.get(6)?, byte_size:r.get(7)?, favorite:r.get(8)?, archived_at:r.get(9)?, revision:r.get(10)?, imported_at:r.get(11)?, updated_at:r.get(12)?, duration_ms:r.get(13)?, width:r.get(14)?, height:r.get(15)?, playback_status:r.get(16)?, tags:vec![], author:"手动导入".into(), source:"manual_import".into(), poster:"local".into(), archived:false, status:"available".into() })
        }).optional()?.ok_or_else(|| FwError::new("ASSET_NOT_FOUND", "素材不存在；请返回素材库。"))?;
        a.archived = a.archived_at.is_some();
        let mut st = db.prepare("SELECT t.name FROM tags t JOIN asset_tags at ON at.tag_id=t.id WHERE at.asset_id=?1 ORDER BY at.position")?;
        a.tags = st
            .query_map([asset_id], |r| r.get(0))?
            .collect::<Result<Vec<String>, _>>()?;
        a.status = match self.managed_file(&a.managed_relpath) {
            Ok(_) => "available",
            Err(e) if e.code == "MANAGED_FILE_MISSING" => "missing",
            Err(_) => "unsupported",
        }
        .into();
        Ok(a)
    }
    pub fn list(&self, offset: usize, limit: usize) -> FwResult<Vec<Asset>> {
        if limit == 0 || limit > 200 || offset > 1_000_000 {
            return Err(FwError::new("VALIDATION_FAILED", "无效的素材列表范围。"));
        }
        let db = self.conn()?;
        let mut st =
            db.prepare("SELECT id FROM assets ORDER BY imported_at DESC,id LIMIT ?1 OFFSET ?2")?;
        let ids = st
            .query_map(params![limit, offset], |r| r.get(0))?
            .collect::<Result<Vec<String>, _>>()?;
        ids.iter().map(|s| self.get_db(&db, s)).collect()
    }
    pub fn update(&self, patch: AssetPatch) -> FwResult<Asset> {
        check_id(&patch.id)?;
        if patch.expected_revision < 0 {
            return Err(FwError::new("VALIDATION_FAILED", "无效的资料修订。"));
        }
        let title = text(&patch.title, 200, true)?;
        let description = text(&patch.description, 4000, false)?;
        let goal = text(&patch.learning_goal, 4000, false)?;
        let tags = tags(&patch.tags)?;
        let mut db = self.conn()?;
        let tx = db.transaction()?;
        let old = self.get_db(&tx, &patch.id)?;
        if old.revision != patch.expected_revision {
            return Err(FwError::new(
                "REVISION_CONFLICT",
                "资料已被更新；输入已保留，请刷新当前修订后重新确认保存。",
            ));
        }
        let archived_at = if patch.archived {
            old.archived_at.or(Some(now()))
        } else {
            None
        };
        tx.execute("UPDATE assets SET title=?1,description=?2,learning_goal=?3,favorite=?4,archived_at=?5,revision=revision+1,updated_at=?6 WHERE id=?7 AND revision=?8",params![title,description,goal,patch.favorite,archived_at,now(),patch.id,patch.expected_revision])?;
        tx.execute("DELETE FROM asset_tags WHERE asset_id=?1", [&patch.id])?;
        set_tags(&tx, &patch.id, &tags)?;
        tx.commit()?;
        self.get_db(&db, &patch.id)
    }
    pub fn metadata(&self, m: Metadata) -> FwResult<()> {
        check_id(&m.id)?;
        if !m.duration_ms.is_finite()
            || m.duration_ms <= 0.0
            || m.duration_ms > 604_800_000.0
            || m.width == 0
            || m.height == 0
            || m.width > 16384
            || m.height > 16384
        {
            return Err(FwError::new("VALIDATION_FAILED", "媒体时长或尺寸无效。"));
        }
        let db = self.conn()?;
        let a = self.get_db(&db, &m.id)?;
        self.managed_file(&a.managed_relpath)?;
        if a.sha256 != m.content_hash {
            return Err(FwError::new(
                "REVISION_CONFLICT",
                "媒体内容已改变，请重新打开视频。",
            ));
        }
        // Media observations do not change the user's edit revision or overwrite draft fields.
        db.execute("UPDATE assets SET duration_ms=?1,width=?2,height=?3,playback_status='metadata_loaded' WHERE id=?4 AND sha256=?5",params![m.duration_ms.round() as i64,m.width,m.height,m.id,m.content_hash])?;
        Ok(())
    }
    pub fn playback_error(&self, asset_id: &str, hash: &str) -> FwResult<()> {
        check_id(asset_id)?;
        let db = self.conn()?;
        db.execute(
            "UPDATE assets SET playback_status='load_failed' WHERE id=?1 AND sha256=?2",
            params![asset_id, hash],
        )?;
        Ok(())
    }
    pub fn managed_file(&self, relative: &str) -> FwResult<PathBuf> {
        let p = self.controlled_path(relative, "media/originals")?;
        let m = fs::symlink_metadata(&p).map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                FwError::new(
                    "MANAGED_FILE_MISSING",
                    "管理副本缺失。资料仍保留；重新选择同内容视频可修复。",
                )
            } else {
                e.into()
            }
        })?;
        if m.file_type().is_symlink() || !m.is_file() {
            return Err(FwError::new("ACCESS_DENIED", "管理副本不是受控普通文件。"));
        }
        let real = p.canonicalize()?;
        if !real.starts_with(self.root.join("media/originals")) {
            return Err(FwError::new("ACCESS_DENIED", "媒体文件超出资料库范围。"));
        }
        Ok(real)
    }
    pub(crate) fn controlled_path(&self, relative: &str, area: &str) -> FwResult<PathBuf> {
        let prefix = format!("{area}/");
        let name = relative
            .strip_prefix(&prefix)
            .ok_or_else(|| FwError::new("ACCESS_DENIED", "无效的资料库文件归属。"))?;
        if name.contains(['/', '\\', '%']) || name.starts_with('.') {
            return Err(FwError::new("ACCESS_DENIED", "不允许越界文件路径。"));
        }
        let (stem, ext) = name
            .rsplit_once('.')
            .ok_or_else(|| FwError::new("ACCESS_DENIED", "无效的管理文件名。"))?;
        check_id(stem).map_err(|_| FwError::new("ACCESS_DENIED", "管理文件名必须由应用生成。"))?;
        if !(if area == "staging" {
            ext == "part"
        } else {
            matches!(ext, "mp4" | "mov")
        }) {
            return Err(FwError::new("ACCESS_DENIED", "无效的管理文件后缀。"));
        }
        let parent = self.root.join(area);
        if parent.canonicalize()? != parent
            || fs::symlink_metadata(&parent)?.file_type().is_symlink()
        {
            return Err(FwError::new(
                "ACCESS_DENIED",
                "资料目录被替换，请检查后重启。",
            ));
        }
        Ok(parent.join(name))
    }
}
fn set_tags(tx: &Transaction<'_>, asset_id: &str, tags: &[String]) -> FwResult<()> {
    for (position, t) in tags.iter().enumerate() {
        tx.execute(
            "INSERT INTO tags(name,normalized) VALUES (?1,?2) ON CONFLICT(normalized) DO NOTHING",
            params![t, t.to_lowercase()],
        )?;
        tx.execute("INSERT INTO asset_tags(asset_id,tag_id,position) SELECT ?1,id,?2 FROM tags WHERE normalized=?3",params![asset_id,position,t.to_lowercase()])?;
    }
    Ok(())
}
pub(crate) fn reject_link(p: &Path) -> FwResult<()> {
    if fs::symlink_metadata(p)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
    {
        Err(FwError::new("ACCESS_DENIED", "资料文件包含异常链接。"))
    } else {
        Ok(())
    }
}
#[cfg(test)]
#[path = "personal_tests.rs"]
mod tests;
