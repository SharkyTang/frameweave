use super::*;
use std::os::unix::fs::symlink;
struct TestRoot(PathBuf);
impl TestRoot {
    fn new() -> Self {
        let p = std::env::temp_dir().join(format!("frameweave-d3-db-{}", id()));
        fs::create_dir(&p).unwrap();
        Self(p)
    }
}
impl Drop for TestRoot {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}
fn seed(lib: &Library) -> String {
    let a = id();
    lib.conn().unwrap().execute("INSERT INTO assets(id,title,original_filename,managed_relpath,sha256,byte_size,imported_at,updated_at) VALUES (?1,'测试','中文 # %.mp4',?2,?3,24,?4,?4)",params![a,format!("media/originals/{a}.mp4"),"a".repeat(64),now()]).unwrap();
    a
}
fn patch(a: &Asset) -> AssetPatch {
    AssetPatch {
        id: a.id.clone(),
        expected_revision: a.revision,
        title: "中文 😀 <img src=x onerror=alert(1)>".into(),
        description: "备注 # % 空格".into(),
        learning_goal: "学习目标".into(),
        tags: vec![" 剪辑 ".into(), "剪辑".into(), "Film".into(), "film".into()],
        favorite: true,
        archived: true,
    }
}
#[test]
fn empty_initialization_and_reopen_never_seed_demo() {
    let t = TestRoot::new();
    fs::write(t.0.join("shell.json"), b"original-shell").unwrap();
    {
        let lib = Library::open(&t.0).unwrap();
        assert!(lib.list(0, 200).unwrap().is_empty());
        assert_eq!(lib.info().unwrap().schema_version, 1);
        let db = lib.conn().unwrap();
        assert_eq!(
            db.query_row("PRAGMA foreign_keys", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            1
        );
        assert_eq!(
            db.query_row("PRAGMA synchronous", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            2
        );
    }
    let lib = Library::open(&t.0).unwrap();
    assert!(lib.list(0, 200).unwrap().is_empty());
    assert_eq!(fs::read(t.0.join("shell.json")).unwrap(), b"original-shell");
    assert_eq!(
        lib.conn()
            .unwrap()
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r
                .get::<_, i64>(0))
            .unwrap(),
        1
    );
}
#[test]
fn persisted_fields_revision_tags_archive_restore() {
    let t = TestRoot::new();
    let a;
    {
        let lib = Library::open(&t.0).unwrap();
        a = seed(&lib);
        let old = lib.get(&a).unwrap();
        let saved = lib.update(patch(&old)).unwrap();
        assert_eq!(saved.revision, 1);
        assert_eq!(saved.tags, vec!["剪辑", "Film"]);
        assert!(saved.favorite && saved.archived);
        assert_eq!(
            lib.update(patch(&old)).unwrap_err().code,
            "REVISION_CONFLICT"
        );
    }
    let lib = Library::open(&t.0).unwrap();
    let old = lib.get(&a).unwrap();
    assert!(old.title.contains("😀"));
    assert_eq!(old.learning_goal, "学习目标");
    assert_eq!(old.status, "missing");
    let mut p = patch(&old);
    p.archived = false;
    let saved = lib.update(p).unwrap();
    assert!(!saved.archived);
    assert_eq!(saved.id, a);
    assert_eq!(saved.revision, 2);
}
#[test]
fn failed_transaction_preserves_fields_and_tag_relationships() {
    let t = TestRoot::new();
    let lib = Library::open(&t.0).unwrap();
    let a = seed(&lib);
    let before = lib.get(&a).unwrap();
    lib.conn().unwrap().execute_batch("CREATE TRIGGER deny_tags BEFORE INSERT ON asset_tags BEGIN SELECT RAISE(ABORT,'injected'); END;").unwrap();
    assert!(lib.update(patch(&before)).is_err());
    let after = lib.get(&a).unwrap();
    assert_eq!(after.title, before.title);
    assert_eq!(after.revision, before.revision);
    assert!(after.tags.is_empty());
    assert!(!after.archived);
}
#[test]
fn foreign_keys_and_content_uniqueness_are_real() {
    let t = TestRoot::new();
    let lib = Library::open(&t.0).unwrap();
    seed(&lib);
    let db = lib.conn().unwrap();
    assert!(db
        .execute("INSERT INTO asset_tags VALUES ('nonexistent',123,0)", [])
        .is_err());
    assert!(db.execute("INSERT INTO assets SELECT 'duplicate',title,description,learning_goal,original_filename,source_kind,'media/originals/other.mp4',sha256,byte_size,favorite,archived_at,revision,imported_at,updated_at,duration_ms,width,height,playback_status FROM assets",[]).is_err());
}
#[test]
fn new_schema_and_corruption_are_blocked_without_rebuilding() {
    let t = TestRoot::new();
    {
        let lib = Library::open(&t.0).unwrap();
        lib.conn()
            .unwrap()
            .pragma_update(None, "user_version", 99)
            .unwrap();
    }
    let p = t.0.join("data/frameweave.sqlite3");
    let before = fs::read(&p).unwrap();
    assert_eq!(Library::open(&t.0).err().unwrap().code, "SCHEMA_TOO_NEW");
    assert_eq!(fs::read(&p).unwrap(), before);
    fs::write(&p, b"this is not a database").unwrap();
    assert_eq!(Library::open(&t.0).err().unwrap().code, "DB_CORRUPT");
    assert_eq!(fs::read(&p).unwrap(), b"this is not a database");
}
#[test]
fn migration_failure_is_transactional_and_has_consistent_snapshot() {
    let t = TestRoot::new();
    fs::create_dir(t.0.join("data")).unwrap();
    let p = t.0.join("data/frameweave.sqlite3");
    {
        let db = Connection::open(&p).unwrap();
        db.execute_batch("CREATE TABLE assets(secret TEXT); INSERT INTO assets VALUES ('retain');")
            .unwrap();
    }
    assert!(Library::open(&t.0).is_err());
    let db = Connection::open(&p).unwrap();
    assert_eq!(
        db.query_row("SELECT secret FROM assets", [], |r| r.get::<_, String>(0))
            .unwrap(),
        "retain"
    );
    assert_eq!(
        db.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        0
    );
    let snaps = fs::read_dir(t.0.join("recovery"))
        .unwrap()
        .collect::<Vec<_>>();
    assert_eq!(snaps.len(), 1);
}
#[test]
fn write_owner_prevents_a_second_library_queue() {
    let t = TestRoot::new();
    let lib = Library::open(&t.0).unwrap();
    assert_eq!(Library::open(&t.0).err().unwrap().code, "DB_BUSY");
    drop(lib);
    assert!(Library::open(&t.0).is_ok());
}
#[test]
fn path_traversal_encoded_paths_absolute_and_links_are_rejected() {
    let t = TestRoot::new();
    let lib = Library::open(&t.0).unwrap();
    let a = id();
    for p in [
        "/etc/passwd",
        "media/originals/../../shell.json",
        "media/originals/%2e%2e.mp4",
        "staging/x.part",
        "media/originals/../x.mp4",
    ] {
        assert!(lib.managed_file(&p).is_err());
    }
    let relative = format!("media/originals/{a}.mp4");
    fs::write(t.0.join("shell.json"), b"private").unwrap();
    symlink(t.0.join("shell.json"), lib.root.join(&relative)).unwrap();
    assert_eq!(
        lib.managed_file(&relative).unwrap_err().code,
        "ACCESS_DENIED"
    );
    assert!(lib.get("../private").is_err());
}
#[test]
fn fields_and_unknown_metadata_are_validated() {
    let t = TestRoot::new();
    let lib = Library::open(&t.0).unwrap();
    let a = seed(&lib);
    let old = lib.get(&a).unwrap();
    assert!(old.duration_ms.is_none());
    let mut p = patch(&old);
    p.title = " ".into();
    assert_eq!(lib.update(p).unwrap_err().code, "VALIDATION_FAILED");
    let mut p = patch(&old);
    p.title = "字".repeat(201);
    assert!(lib.update(p).is_err());
    for duration in [f64::NAN, f64::INFINITY, -1.0] {
        assert!(lib
            .metadata(Metadata {
                id: a.clone(),
                content_hash: old.sha256.clone(),
                playback_token: id(),
                duration_ms: duration,
                width: 640,
                height: 360
            })
            .is_err());
    }
    assert!(serde_json::from_str::<AssetPatch>(r#"{"id":"a","expectedRevision":0,"title":"x","description":"","learningGoal":"","tags":[],"favorite":false,"archived":false,"path":"/etc/passwd"}"#).is_err());
}

#[test]
fn asset_scope_grants_only_exact_validated_copy_and_denies_encoded_escape_and_symlinks() {
    let t = TestRoot::new();
    let lib = Library::open(&t.0).unwrap();
    let a = id();
    let path = lib.root.join(format!("media/originals/{a}.mp4"));
    fs::write(&path, b"controlled copy").unwrap();
    let app = tauri::test::mock_app();
    let scope =
        tauri::scope::fs::Scope::new(&app, &tauri::utils::config::FsScope::AllowedPaths(vec![]))
            .unwrap();
    assert!(!scope.is_allowed(&path));
    scope
        .allow_file(
            lib.managed_file(&format!("media/originals/{a}.mp4"))
                .unwrap(),
        )
        .unwrap();
    assert!(scope.is_allowed(&path));
    for rel in [
        "shell.json",
        "data/frameweave.sqlite3",
        "staging/secret.part",
        "recovery/backup.sqlite3",
        "media/originals/unknown.mp4",
    ] {
        let p = lib.root.join(rel);
        if !p.exists() {
            fs::write(&p, b"private").unwrap();
        }
        assert!(!scope.is_allowed(p));
    }
    assert!(!scope.is_allowed(t.0.join("source.mp4")));
    assert!(!scope.is_allowed(lib.root.join("media/originals/%2e%2e/shell.json")));
    fs::remove_file(&path).unwrap();
    symlink(lib.root.join("shell.json"), &path).unwrap();
    assert!(!scope.is_allowed(path));
}

#[test]
fn full_disk_errors_and_metadata_bounds_are_explicit() {
    assert_eq!(
        FwError::from(std::io::Error::from_raw_os_error(libc::ENOSPC)).code,
        "DISK_FULL"
    );
    let t = TestRoot::new();
    let lib = Library::open(&t.0).unwrap();
    let a = seed(&lib);
    for (width, height) in [(0, 360), (640, 0), (16385, 360), (640, 16385)] {
        assert_eq!(
            lib.metadata(Metadata {
                id: a.clone(),
                content_hash: "a".repeat(64),
                playback_token: id(),
                duration_ms: 1000.0,
                width,
                height
            })
            .unwrap_err()
            .code,
            "VALIDATION_FAILED"
        );
    }
}
