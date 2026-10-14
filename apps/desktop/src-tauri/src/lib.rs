mod commands;
mod imports;
mod personal;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, LogicalSize, Manager, PhysicalPosition,
};

#[derive(Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct ShellPreferences {
    route: String,
    width: f64,
    height: f64,
    x: Option<i32>,
    y: Option<i32>,
}
impl Default for ShellPreferences {
    fn default() -> Self {
        Self {
            route: "/home".into(),
            width: 1440.0,
            height: 900.0,
            x: None,
            y: None,
        }
    }
}
struct ShellState {
    preferences: Mutex<ShellPreferences>,
    path: PathBuf,
    allow_exit: AtomicBool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ShellInfo {
    version: String,
    platform: String,
    architecture: String,
    app_data: String,
    route: String,
    native: bool,
}

fn valid_route(route: &str) -> bool {
    let mut parts = route.split('/');
    if parts.next() != Some("") {
        return false;
    }
    let Some(page) = parts.next() else {
        return false;
    };
    if ![
        "home", "library", "analysis", "creator", "methods", "works", "radar", "settings",
    ]
    .contains(&page)
    {
        return false;
    }
    match parts.next() {
        None => true,
        Some(id) => {
            ["analysis", "creator", "works"].contains(&page)
                && !id.is_empty()
                && id.len() <= 128
                && id
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
                && parts.next().is_none()
        }
    }
}
fn clamped_size(width: f64, height: f64, screen_width: f64, screen_height: f64) -> (f64, f64) {
    let safe = |value: f64, fallback: f64, min: f64, max: f64| {
        let max = max.max(1.0);
        (if value.is_finite() { value } else { fallback }).clamp(min.min(max), max)
    };
    (
        safe(width, 1440.0, 1024.0, screen_width),
        safe(height, 900.0, 680.0, (screen_height - 60.0).max(1.0)),
    )
}
fn write_preferences(state: &ShellState, prefs: &ShellPreferences) -> Result<(), String> {
    let bytes = serde_json::to_vec(prefs).map_err(|_| "无法编码窗口设置".to_string())?;
    let temp = state.path.with_extension("tmp");
    fs::write(&temp, bytes).map_err(|_| "无法写入窗口设置，请检查资料目录权限".to_string())?;
    fs::rename(temp, &state.path).map_err(|_| "无法提交窗口设置".to_string())
}

#[tauri::command]
fn shell_info(app: tauri::AppHandle, state: tauri::State<ShellState>) -> Result<ShellInfo, String> {
    let p = state.preferences.lock().map_err(|_| "窗口设置不可用")?;
    Ok(ShellInfo {
        version: app.package_info().version.to_string(),
        platform: std::env::consts::OS.into(),
        architecture: std::env::consts::ARCH.into(),
        app_data: state.path.parent().unwrap().display().to_string(),
        route: p.route.clone(),
        native: true,
    })
}
#[tauri::command]
fn remember_route(route: String, state: tauri::State<ShellState>) -> Result<(), String> {
    if !valid_route(&route) {
        return Err("无效的应用页面".into());
    }
    let mut p = state.preferences.lock().map_err(|_| "窗口设置不可用")?;
    let mut next = p.clone();
    next.route = route;
    write_preferences(&state, &next)?;
    *p = next;
    Ok(())
}
#[tauri::command]
async fn quit_application(
    app: tauri::AppHandle,
    state: tauri::State<'_, ShellState>,
    data: tauri::State<'_, commands::DataState>,
) -> Result<(), String> {
    let service = data.inner().clone();
    tauri::async_runtime::spawn_blocking(move || service.shutdown())
        .await
        .map_err(|_| "导入安全收尾失败，请重试".to_string())?;
    state.allow_exit.store(true, Ordering::SeqCst);
    app.exit(0);
    Ok(())
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            shell_info,
            remember_route,
            quit_application,
            commands::library_info,
            commands::list_assets,
            commands::get_asset,
            commands::update_asset,
            commands::choose_local_videos,
            commands::start_import,
            commands::import_batch,
            commands::cancel_import,
            commands::resolve_playback,
            commands::release_playback,
            commands::record_media_metadata,
            commands::record_playback_failure,
            commands::isolated_media_probe,
            commands::record_isolated_probe
        ])
        .setup(|app| {
            let dir = commands::data_root(app.handle()).map_err(|e| e.message)?;
            app.manage(commands::DataState::new(dir.clone()));
            fs::create_dir_all(&dir)?;
            let path = dir.join("shell.json");
            let prefs: ShellPreferences = fs::read(&path)
                .ok()
                .and_then(|data| serde_json::from_slice(&data).ok())
                .unwrap_or_default();
            let prefs = ShellPreferences {
                route: if valid_route(&prefs.route) {
                    prefs.route.clone()
                } else {
                    "/home".into()
                },
                ..prefs
            };
            app.manage(ShellState {
                preferences: Mutex::new(prefs.clone()),
                path,
                allow_exit: AtomicBool::new(false),
            });
            let w = app.get_webview_window("main").unwrap();
            if let Some(m) = w.primary_monitor()? {
                let scale = m.scale_factor();
                let (width, height) = clamped_size(
                    prefs.width,
                    prefs.height,
                    m.size().width as f64 / scale,
                    m.size().height as f64 / scale,
                );
                w.set_size(LogicalSize::new(width, height))?;
                let monitors = w.available_monitors()?;
                let visible = prefs
                    .x
                    .zip(prefs.y)
                    .map(|(x, y)| {
                        monitors.iter().any(|monitor| {
                            let start = monitor.position();
                            let size = monitor.size();
                            x >= start.x
                                && y >= start.y
                                && (x as i64 + (width * scale) as i64)
                                    <= start.x as i64 + size.width as i64
                                && (y as i64 + (height * scale) as i64)
                                    <= start.y as i64 + size.height as i64
                        })
                    })
                    .unwrap_or(false);
                if visible {
                    w.set_position(PhysicalPosition::new(prefs.x.unwrap(), prefs.y.unwrap()))?;
                } else {
                    w.center()?;
                }
            }
            let new_project =
                MenuItem::with_id(app, "new", "新建创作项目", true, Some("CmdOrCtrl+N"))?;
            let import =
                MenuItem::with_id(app, "import", "导入参考素材…", true, Some("CmdOrCtrl+O"))?;
            let save = MenuItem::with_id(app, "save", "保存当前编辑", true, Some("CmdOrCtrl+S"))?;
            let search =
                MenuItem::with_id(app, "search", "搜索与命令…", true, Some("CmdOrCtrl+K"))?;
            let settings = MenuItem::with_id(app, "settings", "设置…", true, Some("CmdOrCtrl+,"))?;
            let close = MenuItem::with_id(app, "close", "关闭窗口", true, Some("CmdOrCtrl+W"))?;
            let reopen = MenuItem::with_id(app, "reopen", "显示工作台", true, None::<&str>)?;
            // macOS's predefined quit item terminates directly, bypassing the demo confirmation.
            let quit = MenuItem::with_id(app, "quit", "退出FrameWeave", true, Some("CmdOrCtrl+Q"))?;
            let menu = Menu::with_items(
                app,
                &[
                    &Submenu::with_items(
                        app,
                        "FrameWeave",
                        true,
                        &[
                            &PredefinedMenuItem::about(app, Some("关于FrameWeave"), None)?,
                            &settings,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::hide(app, Some("隐藏FrameWeave"))?,
                            &PredefinedMenuItem::hide_others(app, Some("隐藏其他"))?,
                            &PredefinedMenuItem::show_all(app, Some("显示全部"))?,
                            &PredefinedMenuItem::separator(app)?,
                            &quit,
                        ],
                    )?,
                    &Submenu::with_items(
                        app,
                        "文件",
                        true,
                        &[
                            &new_project,
                            &import,
                            &save,
                            &search,
                            &PredefinedMenuItem::separator(app)?,
                            &close,
                        ],
                    )?,
                    &Submenu::with_items(
                        app,
                        "编辑",
                        true,
                        &[
                            &PredefinedMenuItem::undo(app, Some("撤销"))?,
                            &PredefinedMenuItem::redo(app, Some("重做"))?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::cut(app, Some("剪切"))?,
                            &PredefinedMenuItem::copy(app, Some("复制"))?,
                            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
                            &PredefinedMenuItem::select_all(app, Some("全选"))?,
                        ],
                    )?,
                    &Submenu::with_items(
                        app,
                        "窗口",
                        true,
                        &[
                            &PredefinedMenuItem::minimize(app, Some("最小化"))?,
                            &PredefinedMenuItem::fullscreen(app, Some("进入全屏"))?,
                            &reopen,
                        ],
                    )?,
                ],
            )?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                if let Some(w) = app.get_webview_window("main") {
                    match event.id().as_ref() {
                        "close" => {
                            let _ = w.hide();
                        }
                        "reopen" => {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                        "quit" => {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                            let _ = app.emit("desktop-action", "quit");
                        }
                        action => {
                            let _ = app.emit("desktop-action", action);
                        }
                    }
                }
            });
            w.show()?;
            w.set_focus()?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => {
                let Some(state) = window.try_state::<ShellState>() else {
                    return;
                };
                if let (Ok(size), Ok(position), Ok(scale), Ok(mut p)) = (
                    window.inner_size(),
                    window.outer_position(),
                    window.scale_factor(),
                    state.preferences.lock(),
                ) {
                    if !window.is_minimized().unwrap_or(false)
                        && !window.is_fullscreen().unwrap_or(false)
                        && size.width > 0
                        && size.height > 0
                    {
                        p.width = size.width as f64 / scale;
                        p.height = size.height as f64 / scale;
                        p.x = Some(position.x);
                        p.y = Some(position.y);
                        if write_preferences(&state, &p).is_err() {
                            eprintln!("shell: preference write failed");
                            let _ = window.emit("shell-error", "窗口设置保存失败");
                        }
                    }
                };
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("桌面启动失败，请检查系统环境或资料目录权限");
    app.run(|app, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            if !app.state::<ShellState>().allow_exit.load(Ordering::SeqCst) {
                api.prevent_exit();
                let _ = app.emit("desktop-action", "quit");
            }
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }
        _ => {}
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_local_routes_are_persisted() {
        for route in [
            "/home",
            "/settings",
            "/analysis/demo-video-1",
            "/creator/project_123",
        ] {
            assert!(valid_route(route));
        }
        for route in [
            "https://example.com",
            "/home/../../secret",
            "/creator/",
            "/home/abc",
            "/analysis/a/b",
            "/library?q=x",
        ] {
            assert!(!valid_route(route));
        }
    }
    #[test]
    fn restores_window_within_screen_and_handles_invalid_size() {
        assert_eq!(clamped_size(1728.0, 900.0, 1440.0, 900.0), (1440.0, 840.0));
        assert_eq!(
            clamped_size(f64::NAN, -1.0, 1920.0, 1080.0),
            (1440.0, 680.0)
        );
        assert_eq!(clamped_size(1440.0, 900.0, 800.0, 600.0), (800.0, 540.0));
    }
}
