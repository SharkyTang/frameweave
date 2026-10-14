fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "shell_info",
            "remember_route",
            "quit_application",
            "library_info",
            "list_assets",
            "get_asset",
            "update_asset",
            "choose_local_videos",
            "start_import",
            "import_batch",
            "cancel_import",
            "resolve_playback",
            "release_playback",
            "record_media_metadata",
            "record_playback_failure",
            "isolated_media_probe",
            "record_isolated_probe",
        ]),
    ))
    .expect("FrameWeave capability build failed");
}
