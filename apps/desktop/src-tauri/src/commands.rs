use crate::{
    imports::{Batch, Imports, Selection},
    personal::{Asset, AssetPatch, FwError, FwResult, Library, LibraryInfo, Metadata},
};
use serde::Serialize;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{atomic::Ordering, Arc, Condvar, Mutex},
};
use tauri::{Emitter, Manager};
struct Init {
    value: Mutex<Option<FwResult<Arc<Imports>>>>,
    ready: Condvar,
}
#[derive(Clone)]
pub struct DataState {
    init: Arc<Init>,
    playback: Arc<Mutex<HashMap<String, (String, String)>>>,
}
impl DataState {
    pub fn new(root: PathBuf) -> Self {
        let init = Arc::new(Init {
            value: Mutex::new(None),
            ready: Condvar::new(),
        });
        let worker = init.clone();
        std::thread::spawn(move || {
            let result = Library::open(&root)
                .and_then(|lib| Imports::new(Arc::new(lib)))
                .map(Arc::new);
            *worker.value.lock().unwrap() = Some(result);
            worker.ready.notify_all();
        });
        Self {
            init,
            playback: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    pub fn service(&self) -> FwResult<Arc<Imports>> {
        let mut v = self.init.value.lock().unwrap();
        while v.is_none() {
            v = self.init.ready.wait(v).unwrap();
        }
        v.as_ref().unwrap().clone()
    }
    pub fn shutdown(&self) {
        if let Ok(service) = self.service() {
            service.shutdown();
        }
        self.playback.lock().unwrap().clear();
    }
    fn with_playback<T>(
        &self,
        token: &str,
        asset: &str,
        hash: &str,
        apply: impl FnOnce() -> FwResult<T>,
    ) -> FwResult<T> {
        let sessions = self.playback.lock().unwrap();
        if sessions
            .get(token)
            .is_some_and(|v| v.0 == asset && v.1 == hash)
        {
            apply()
        } else {
            Err(FwError::new(
                "REVISION_CONFLICT",
                "播放会话已关闭或属于其他素材；忽略过期媒体回调。",
            ))
        }
    }
}
// Developer-only isolated validation opt-in; no IPC root override and no production-data injection.
pub fn data_root(app: &tauri::AppHandle) -> FwResult<PathBuf> {
    if let Some(value) = std::env::var_os("FRAMEWEAVE_TEST_DATA_ROOT") {
        if std::env::var("FRAMEWEAVE_TEST_MODE").as_deref() != Ok("1") {
            return Err(FwError::new("ACCESS_DENIED", "测试资料根未显式启用。"));
        }
        let p = PathBuf::from(value).canonicalize()?;
        if p.parent() != Some(Path::new("/private/tmp"))
            || !p
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .starts_with("frameweave-d3-native-")
            || std::fs::read_to_string(p.join(".frameweave-test-root")).unwrap_or_default()
                != "FrameWeave D3 isolated validation\n"
        {
            return Err(FwError::new(
                "ACCESS_DENIED",
                "测试根标记或路径无效，未触碰正式资料。",
            ));
        }
        return Ok(p);
    }
    app.path()
        .app_data_dir()
        .map_err(|_| FwError::new("DB_INIT_FAILED", "无法解析应用资料目录。"))
}
fn trusted(w: &tauri::WebviewWindow) -> FwResult<()> {
    let url = w
        .url()
        .map_err(|_| FwError::new("ACCESS_DENIED", "无效的窗口来源。"))?;
    let local = url.scheme() == "tauri" && url.host_str() == Some("localhost");
    let dev = cfg!(debug_assertions)
        && url.scheme() == "http"
        && url.host_str() == Some("127.0.0.1")
        && url.port() == Some(1420);
    if w.label() == "main" && (local || dev) {
        Ok(())
    } else {
        Err(FwError::new(
            "ACCESS_DENIED",
            "只有本机主窗口能访问个人资料。",
        ))
    }
}
async fn run<T: Send + 'static>(f: impl FnOnce() -> FwResult<T> + Send + 'static) -> FwResult<T> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|_| FwError::new("IO_FAILED", "本机后台操作中断，请重试。"))?
}
#[tauri::command]
pub async fn library_info(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
) -> FwResult<LibraryInfo> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || s.service()?.lib.info()).await
}
#[tauri::command]
pub async fn list_assets(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    offset: usize,
    limit: usize,
) -> FwResult<Vec<Asset>> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || s.service()?.lib.list(offset, limit)).await
}
#[tauri::command]
pub async fn get_asset(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    id: String,
) -> FwResult<Asset> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || s.service()?.lib.get(&id)).await
}
#[tauri::command]
pub async fn update_asset(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    input: AssetPatch,
) -> FwResult<Asset> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || s.service()?.lib.update(input)).await
}
#[tauri::command]
pub async fn choose_local_videos(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
) -> FwResult<Selection> {
    trusted(&window)?;
    let s = state.inner().clone();
    let imports = run(move || s.service()).await?;
    imports.available()?;
    if imports.selecting.swap(true, Ordering::SeqCst) {
        return Err(FwError::new("IMPORT_BUSY", "文件选择器已经打开。"));
    }
    let files = rfd::AsyncFileDialog::new()
        .set_title("复制视频到映构资料库 · 原文件保留")
        .add_filter("MP4 / MOV 候选（编码需验证）", &["mp4", "mov"])
        .set_can_create_directories(false)
        .pick_files()
        .await;
    imports.selecting.store(false, Ordering::SeqCst);
    run(move || {
        imports.selected(
            files
                .unwrap_or_default()
                .into_iter()
                .map(|f| f.path().to_path_buf())
                .collect(),
        )
    })
    .await
}
#[tauri::command]
pub async fn start_import(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<'_, DataState>,
    token: String,
) -> FwResult<Batch> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || {
        s.service()?.start(
            &token,
            Arc::new(move |attempt_id| {
                let _ = app.emit("import-progress", attempt_id);
            }),
        )
    })
    .await
}
#[tauri::command]
pub async fn import_batch(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    id: Option<String>,
) -> FwResult<Option<Batch>> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || s.service()?.batch(id.as_deref())).await
}
#[tauri::command]
pub async fn cancel_import(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    id: String,
    attempt_id: Option<String>,
) -> FwResult<()> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || s.service()?.cancel(&id, attempt_id.as_deref())).await
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Playback {
    asset_id: String,
    path: String,
    content_hash: String,
    playback_token: String,
}
#[tauri::command]
pub async fn resolve_playback(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<'_, DataState>,
    id: String,
) -> FwResult<Playback> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || {
        let lib = s.service()?.lib.clone();
        let a = lib.get(&id)?;
        let path = lib.managed_file(&a.managed_relpath)?;
        if std::fs::metadata(&path)?.len() != a.byte_size {
            return Err(FwError::new(
                "ACCESS_DENIED",
                "管理副本大小与入库记录不一致，保留资料供检查。",
            ));
        }
        std::fs::File::open(&path)?;
        let scope = app.asset_protocol_scope();
        scope
            .allow_file(&path)
            .map_err(|_| FwError::new("ACCESS_DENIED", "媒体协议授权失败。"))?;
        // These must stay denied even after a real media grant. Never grant a directory or original source.
        for rel in [
            "data/frameweave.sqlite3",
            "shell.json",
            "staging",
            "recovery",
        ] {
            if scope.is_allowed(lib.root.join(rel)) {
                return Err(FwError::new(
                    "ACCESS_DENIED",
                    "媒体权限边界异常，停止播放。",
                ));
            }
        }
        let token = crate::personal::id();
        let mut sessions = s.playback.lock().unwrap();
        sessions.clear();
        sessions.insert(token.clone(), (a.id.clone(), a.sha256.clone()));
        Ok(Playback {
            asset_id: a.id,
            path: path.to_string_lossy().into(),
            content_hash: a.sha256,
            playback_token: token,
        })
    })
    .await
}
#[tauri::command]
pub async fn release_playback(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    token: String,
) -> FwResult<()> {
    trusted(&window)?;
    state.playback.lock().unwrap().remove(&token);
    Ok(())
}
#[tauri::command]
pub async fn record_media_metadata(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    input: Metadata,
) -> FwResult<()> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || {
        let token = input.playback_token.clone();
        let id = input.id.clone();
        let hash = input.content_hash.clone();
        s.with_playback(&token, &id, &hash, || s.service()?.lib.metadata(input))
    })
    .await
}
#[tauri::command]
pub async fn record_playback_failure(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    id: String,
    content_hash: String,
    token: String,
) -> FwResult<()> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || {
        s.with_playback(&token, &id, &content_hash, || {
            s.service()?.lib.playback_error(&id, &content_hash)
        })
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn stale_and_foreign_media_callbacks_are_rejected_and_released_sessions_cannot_write() {
        let root =
            std::env::temp_dir().join(format!("frameweave-d3-lease-{}", crate::personal::id()));
        std::fs::create_dir(&root).unwrap();
        let state = DataState::new(root.clone());
        let service = state.service().unwrap();
        let token = crate::personal::id();
        let asset = crate::personal::id();
        let hash = "a".repeat(64);
        state
            .playback
            .lock()
            .unwrap()
            .insert(token.clone(), (asset.clone(), hash.clone()));
        assert!(state
            .with_playback(&token, &asset, &hash, || Ok(()))
            .is_ok());
        assert_eq!(
            state
                .with_playback(&token, "other", &hash, || Ok(()))
                .unwrap_err()
                .code,
            "REVISION_CONFLICT"
        );
        assert!(state
            .with_playback("forged", &asset, &hash, || Ok(()))
            .is_err());
        assert!(state
            .with_playback(&token, &asset, "changed", || Ok(()))
            .is_err());
        state.playback.lock().unwrap().remove(&token);
        assert!(state
            .with_playback(&token, &asset, &hash, || -> FwResult<()> {
                panic!("a stale callback must never run")
            })
            .is_err());
        drop(service);
        drop(state);
        std::fs::remove_dir_all(root).unwrap();
    }
}

// Explicit developer validation only, guarded by the isolated-root marker and environment.
// No arbitrary path input, and never enabled for the normal personal library.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeTarget {
    name: String,
    path: String,
    scope_allowed: bool,
}
#[derive(serde::Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProbeResult {
    name: String,
    loaded: bool,
    error_code: Option<u16>,
    duration_ms: Option<f64>,
    width: Option<u32>,
    height: Option<u32>,
}
fn probe_enabled(lib: &Library) -> bool {
    std::env::var("FRAMEWEAVE_TEST_NATIVE_PROBE").as_deref() == Ok("1")
        && std::env::var("FRAMEWEAVE_TEST_MODE").as_deref() == Ok("1")
        && lib.root.parent() == Some(Path::new("/private/tmp"))
        && lib
            .root
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .starts_with("frameweave-d3-native-")
        && std::fs::read_to_string(lib.root.join(".frameweave-test-root"))
            .ok()
            .as_deref()
            == Some("FrameWeave D3 isolated validation\n")
}
#[tauri::command]
pub async fn isolated_media_probe(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<'_, DataState>,
) -> FwResult<Vec<ProbeTarget>> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || {
        let lib = s.service()?.lib.clone();
        if !probe_enabled(&lib) {
            return Err(FwError::new("NOT_IMPLEMENTED", "隔离验证未启用。"));
        }
        let asset = lib
            .list(0, 1)?
            .pop()
            .ok_or_else(|| FwError::new("ASSET_NOT_FOUND", "需要已通过原生选择导入的测试片。"))?;
        let media = lib.managed_file(&asset.managed_relpath)?;
        let scope = app.asset_protocol_scope();
        scope
            .allow_file(&media)
            .map_err(|_| FwError::new("ACCESS_DENIED", "验证媒体授权失败。"))?;
        let mut paths = vec![
            ("media", media),
            ("database", lib.root.join("data/frameweave.sqlite3")),
            ("shell", lib.root.join("shell.json")),
            ("staging", lib.root.join("staging/probe-private.part")),
            ("recovery", lib.root.join("recovery/probe-private.json")),
            ("source", lib.root.join("input/原生音轨 空格#%.mp4")),
        ];
        for name in ["staging/probe-private.part", "recovery/probe-private.json"] {
            let p = lib.root.join(name);
            if !p.exists() {
                std::fs::write(p, b"isolated validation sentinel")?;
            }
        }
        // A generated but unregistered path must never be granted, including a symlink into metadata.
        let link = lib
            .root
            .join("media/originals/00000000-0000-0000-0000-000000000001.mp4");
        if std::fs::symlink_metadata(&link).is_err() {
            std::os::unix::fs::symlink(lib.root.join("data/frameweave.sqlite3"), &link)?;
        }
        paths.push(("symlink", link));
        Ok(paths
            .into_iter()
            .map(|(name, p)| ProbeTarget {
                name: name.into(),
                scope_allowed: scope.is_allowed(&p),
                path: p.to_string_lossy().into(),
            })
            .collect())
    })
    .await
}
#[tauri::command]
pub async fn record_isolated_probe(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DataState>,
    results: Vec<ProbeResult>,
) -> FwResult<()> {
    trusted(&window)?;
    let s = state.inner().clone();
    run(move || {
        let lib = s.service()?.lib.clone();
        if !probe_enabled(&lib) {
            return Err(FwError::new("NOT_IMPLEMENTED", "隔离验证未启用。"));
        }
        let names = [
            "media", "database", "shell", "staging", "recovery", "source", "symlink",
        ];
        if results.len() != names.len()
            || names
                .iter()
                .any(|n| results.iter().filter(|r| &r.name == n).count() != 1)
            || results.iter().any(|r| {
                r.duration_ms
                    .is_some_and(|d| !d.is_finite() || d < 0.0 || d > 604800000.0)
            })
        {
            return Err(FwError::new("VALIDATION_FAILED", "验证结果格式无效。"));
        }
        let path = lib.root.join("native-media-probe.json");
        let data = serde_json::to_vec_pretty(&results)
            .map_err(|_| FwError::new("IO_FAILED", "无法编码验证结果。"))?;
        std::fs::write(path, data)?;
        Ok(())
    })
    .await
}
