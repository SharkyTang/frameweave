use super::*;
use crate::personal::AssetPatch;
struct Root(PathBuf);
impl Root {
    fn new() -> Self {
        let p = std::env::temp_dir().join(format!("frameweave-d3-import-{}", id()));
        fs::create_dir(&p).unwrap();
        Self(p)
    }
    fn source(&self, name: &str, extra: usize) -> PathBuf {
        let p = self.0.join(name);
        let mut data = b"\0\0\0\x18ftypisom\0\0\0\0isommp42".to_vec();
        data.resize(data.len() + extra, 7);
        fs::write(&p, data).unwrap();
        p
    }
}
impl Drop for Root {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}
fn open(t: &Root) -> Arc<Imports> {
    Arc::new(Imports::new(Arc::new(Library::open(&t.0.join("app-data")).unwrap())).unwrap())
}
fn noop() -> Arc<dyn Fn(&str) + Send + Sync> {
    Arc::new(|_| {})
}
fn wait(s: &Imports, id: &str) -> Batch {
    let mut rt = s.runtime.lock().unwrap();
    while rt.active.is_some() {
        rt = s.idle.wait(rt).unwrap();
    }
    drop(rt);
    s.batch(Some(id)).unwrap().unwrap()
}
fn import(s: &Arc<Imports>, paths: Vec<PathBuf>) -> Batch {
    let selection = s.selected(paths).unwrap();
    let b = s
        .start(selection.token.as_deref().unwrap(), noop())
        .unwrap();
    wait(s, &b.id)
}
fn staged(s: &Imports, source: &Path, state: &str) -> Attempt {
    let aid = id();
    let candidate = id();
    let hash = digest_file(source).unwrap();
    let a = Attempt {
        id: aid.clone(),
        candidate: candidate.clone(),
        filename: "test.mp4".into(),
        title: "recovery".into(),
        stage: format!("staging/{aid}.part"),
        target: format!("media/originals/{candidate}.mp4"),
        state: state.into(),
        hash: Some(hash.0),
        size: hash.1,
    };
    fs::copy(source, s.lib.root.join(&a.stage)).unwrap();
    s.lib.conn().unwrap().execute("INSERT INTO import_attempts(id,batch_id,candidate_id,original_filename,title,stage_relpath,target_relpath,state,sha256,total_bytes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?11)",params![a.id,id(),a.candidate,a.filename,a.title,a.stage,a.target,a.state,a.hash,a.size,now()]).unwrap();
    a
}
#[test]
fn managed_copy_survives_source_removal_and_reopen() {
    let t = Root::new();
    let source = t.source("中文 空格#%.mp4", 2 * CHUNK);
    let expected = fs::read(&source).unwrap();
    let aid;
    {
        let s = open(&t);
        let b = import(&s, vec![source.clone()]);
        assert_eq!(b.items[0].state, "imported");
        aid = b.items[0].asset_id.clone().unwrap();
        let a = s.lib.get(&aid).unwrap();
        assert_eq!(a.byte_size, expected.len() as u64);
        assert_eq!(
            fs::read(s.lib.managed_file(&a.managed_relpath).unwrap()).unwrap(),
            expected
        );
        assert_eq!(fs::read(&source).unwrap(), expected);
        assert_eq!(a.source, "manual_import");
        assert!(a.duration_ms.is_none());
        assert!(fs::read_dir(s.lib.root.join("staging"))
            .unwrap()
            .next()
            .is_none());
    }
    fs::remove_file(source).unwrap();
    let s = open(&t);
    let a = s.lib.get(&aid).unwrap();
    assert_eq!(
        fs::read(s.lib.managed_file(&a.managed_relpath).unwrap()).unwrap(),
        expected
    );
}
#[test]
fn dedup_archive_and_same_name_different_content_preserve_metadata() {
    let t = Root::new();
    let s = open(&t);
    let p = t.source("same.mp4", 100);
    let b = import(&s, vec![p.clone()]);
    let aid = b.items[0].asset_id.as_ref().unwrap();
    let a = s.lib.get(aid).unwrap();
    s.lib
        .update(AssetPatch {
            id: a.id.clone(),
            expected_revision: a.revision,
            title: "我的资料".into(),
            description: "retain".into(),
            learning_goal: "goal".into(),
            tags: vec!["标签".into()],
            favorite: true,
            archived: true,
        })
        .unwrap();
    let renamed = t.0.join("renamed.mp4");
    fs::copy(&p, &renamed).unwrap();
    let duplicate = import(&s, vec![renamed]);
    assert_eq!(duplicate.items[0].state, "duplicate");
    assert_eq!(duplicate.items[0].asset_id.as_deref(), Some(aid.as_str()));
    assert_eq!(duplicate.items[0].archived, Some(true));
    let retained = s.lib.get(aid).unwrap();
    assert!(retained.archived && retained.favorite);
    assert_eq!(retained.title, "我的资料");
    t.source("same.mp4", 101);
    let next = import(&s, vec![p]);
    assert_eq!(next.items[0].state, "imported");
    assert_ne!(next.items[0].asset_id, duplicate.items[0].asset_id);
    assert_eq!(s.lib.list(0, 200).unwrap().len(), 2);
}
#[test]
fn missing_copy_repairs_same_asset_id_with_original_fields() {
    let t = Root::new();
    let s = open(&t);
    let p = t.source("same.mp4", 100);
    let b = import(&s, vec![p.clone()]);
    let aid = b.items[0].asset_id.as_ref().unwrap();
    let a = s.lib.get(aid).unwrap();
    s.lib
        .update(AssetPatch {
            id: a.id.clone(),
            expected_revision: 0,
            title: "保留标题".into(),
            description: "保留备注".into(),
            learning_goal: "目标".into(),
            tags: vec!["标签".into()],
            favorite: true,
            archived: true,
        })
        .unwrap();
    fs::remove_file(s.lib.managed_file(&a.managed_relpath).unwrap()).unwrap();
    assert_eq!(s.lib.get(aid).unwrap().status, "missing");
    let fixed = import(&s, vec![p]);
    assert_eq!(fixed.items[0].state, "repaired");
    assert_eq!(fixed.items[0].asset_id.as_deref(), Some(aid.as_str()));
    let a = s.lib.get(aid).unwrap();
    assert_eq!(a.title, "保留标题");
    assert_eq!(a.revision, 1);
    assert_eq!(a.tags, vec!["标签"]);
    assert!(a.favorite && a.archived);
    assert_eq!(s.lib.list(0, 200).unwrap().len(), 1);
}
#[test]
fn partial_failures_are_per_item_and_never_fake_success() {
    let t = Root::new();
    let s = open(&t);
    let good = t.source("good.mp4", 100);
    let fake = t.0.join("fake.mp4");
    fs::write(&fake, b"not a video").unwrap();
    let empty = t.0.join("zero.mp4");
    fs::write(&empty, b"").unwrap();
    let dir = t.0.join("directory.mp4");
    fs::create_dir(&dir).unwrap();
    let b = import(&s, vec![good, fake, empty, dir]);
    assert_eq!(
        b.items.iter().map(|i| i.state.as_str()).collect::<Vec<_>>(),
        vec!["imported", "failed", "failed", "failed"]
    );
    assert_eq!(s.lib.list(0, 200).unwrap().len(), 1);
}
#[test]
fn batch_limits_size_limits_space_and_tokens_are_enforced() {
    let t = Root::new();
    let s = open(&t);
    assert_eq!(
        s.selected(vec![t.0.clone(); 21]).err().unwrap().code,
        "LIMIT_EXCEEDED"
    );
    assert_eq!(
        s.start(&id(), noop()).err().unwrap().code,
        "SELECTION_EXPIRED"
    );
    let p = t.source("huge.mp4", 0);
    OpenOptions::new()
        .write(true)
        .open(&p)
        .unwrap()
        .set_len(MAX_BYTES + 1)
        .unwrap();
    let b = import(&s, vec![p]);
    assert_eq!(b.items[0].error.as_ref().unwrap().code, "LIMIT_EXCEEDED");
    assert!(s.lib.list(0, 200).unwrap().is_empty());
    assert_eq!(ensure_space(RESERVE, 1).unwrap_err().code, "DISK_FULL");
    let p = t.source("expired.mp4", 0);
    let token = s.selected(vec![p]).unwrap().token.unwrap();
    s.runtime
        .lock()
        .unwrap()
        .selection
        .as_mut()
        .unwrap()
        .expires = 0;
    assert_eq!(
        s.start(&token, noop()).err().unwrap().code,
        "SELECTION_EXPIRED"
    );
}
#[test]
fn repeated_start_returns_same_durable_batch_and_only_one_copy() {
    let t = Root::new();
    let s = open(&t);
    let p = t.source("same.mp4", CHUNK);
    let token = s.selected(vec![p]).unwrap().token.unwrap();
    let first = s.start(&token, noop()).unwrap();
    let second = s.start(&token, noop()).unwrap();
    assert_eq!(first.id, second.id);
    let completed = wait(&s, &first.id);
    let again = s.start(&token, noop()).unwrap();
    assert_eq!(completed.items[0].asset_id, again.items[0].asset_id);
    assert_eq!(s.lib.list(0, 200).unwrap().len(), 1);
}
#[test]
fn cancel_mid_copy_preserves_completed_items_and_removes_owned_stage() {
    let t = Root::new();
    let s = open(&t);
    let small = t.source("small.mp4", 0);
    let large = t.source("large.mp4", 8 * CHUNK);
    let selection = s.selected(vec![small, large.clone()]).unwrap();
    let weak = Arc::downgrade(&s);
    let notify: Arc<dyn Fn(&str) + Send + Sync> = Arc::new(move |aid| {
        if let Some(s) = weak.upgrade() {
            if !aid.is_empty() {
                let a = s.attempt(aid).unwrap();
                if a.filename == "large.mp4" && a.state == "copying" {
                    let batch = s.runtime.lock().unwrap().active.clone().unwrap();
                    s.cancel(&batch, Some(aid)).unwrap();
                }
            }
        }
    });
    let b = s
        .start(selection.token.as_deref().unwrap(), notify)
        .unwrap();
    let done = wait(&s, &b.id);
    assert_eq!(done.items[0].state, "imported");
    assert_eq!(done.items[1].state, "cancelled");
    assert_eq!(s.lib.list(0, 200).unwrap().len(), 1);
    assert!(fs::read_dir(s.lib.root.join("staging"))
        .unwrap()
        .next()
        .is_none());
    assert!(large.is_file());
}
#[test]
fn source_changes_and_read_failures_do_not_commit() {
    let t = Root::new();
    let s = open(&t);
    let p = t.source("changed.mp4", 2 * CHUNK);
    let selection = s.selected(vec![p.clone()]).unwrap();
    fs::write(&p, b"changed after selection").unwrap();
    let b = s
        .start(selection.token.as_deref().unwrap(), noop())
        .unwrap();
    let done = wait(&s, &b.id);
    assert_eq!(done.items[0].error.as_ref().unwrap().code, "SOURCE_CHANGED");
    let p = t.source("removed.mp4", 100);
    let selection = s.selected(vec![p.clone()]).unwrap();
    fs::remove_file(p).unwrap();
    let b = s
        .start(selection.token.as_deref().unwrap(), noop())
        .unwrap();
    assert_eq!(wait(&s, &b.id).items[0].state, "failed");
    assert!(s.lib.list(0, 200).unwrap().is_empty());
}
#[test]
fn startup_reconciles_copy_stage_publish_and_commit_windows() {
    let t = Root::new();
    let source = t.source("recover.mp4", 100);
    let ids;
    {
        let s = open(&t);
        let interrupted = staged(&s, &source, "copying");
        let saved_stage = staged(&s, &source, "staged");
        let published_source = t.source("different.mp4", 101);
        let published = staged(&s, &published_source, "committing");
        fs::hard_link(
            s.lib.root.join(&published.stage),
            s.lib.root.join(&published.target),
        )
        .unwrap();
        let committed_source = t.source("committed.mp4", 102);
        let committed = staged(&s, &committed_source, "staged");
        s.finish(&committed).unwrap();
        ids = (interrupted, saved_stage, published, committed);
    }
    let s = open(&t);
    assert_eq!(s.attempt(&ids.0.id).unwrap().state, "interrupted");
    assert_eq!(s.attempt(&ids.1.id).unwrap().state, "imported");
    assert_eq!(s.attempt(&ids.2.id).unwrap().state, "imported");
    assert_eq!(s.attempt(&ids.3.id).unwrap().state, "imported");
    assert_eq!(s.lib.list(0, 200).unwrap().len(), 3);
    assert!(fs::read_dir(s.lib.root.join("staging"))
        .unwrap()
        .next()
        .is_none());
    drop(s);
    let s = open(&t);
    assert_eq!(s.lib.list(0, 200).unwrap().len(), 3);
}
#[test]
fn unknown_files_and_conflicting_published_target_are_preserved() {
    let t = Root::new();
    let p = t.source("recover.mp4", 100);
    let target;
    {
        let s = open(&t);
        let a = staged(&s, &p, "committing");
        target = s.lib.root.join(&a.target);
        fs::write(&target, b"unowned").unwrap();
        fs::write(s.lib.root.join("media/originals/unknown.mp4"), b"unknown").unwrap();
    }
    let s = open(&t);
    assert!(s.lib.list(0, 200).unwrap().is_empty());
    assert_eq!(fs::read(target).unwrap(), b"unowned");
    assert_eq!(s.lib.info().unwrap().recovery_warnings, 2);
    assert_eq!(
        fs::read(s.lib.root.join("media/originals/unknown.mp4")).unwrap(),
        b"unknown"
    );
}
#[test]
fn database_commit_failure_after_publication_never_reports_imported() {
    let t = Root::new();
    let s = open(&t);
    let p = t.source("source.mp4", 100);
    s.lib.conn().unwrap().execute_batch("CREATE TRIGGER fail_assets BEFORE INSERT ON assets BEGIN SELECT RAISE(ABORT,'test'); END;").unwrap();
    let b = import(&s, vec![p.clone()]);
    assert_eq!(b.items[0].state, "needs_review");
    assert!(s.lib.list(0, 200).unwrap().is_empty());
    assert!(p.is_file());
    assert_eq!(
        fs::read_dir(s.lib.root.join("media/originals"))
            .unwrap()
            .count(),
        1
    );
}
#[test]
fn forged_source_symlink_and_foreign_attempt_cancellation_are_rejected() {
    use std::os::unix::fs::symlink;
    let t = Root::new();
    let s = open(&t);
    let p = t.source("source.mp4", 100);
    let linked = t.0.join("link.mp4");
    symlink(p, &linked).unwrap();
    let b = import(&s, vec![linked]);
    assert_eq!(b.items[0].state, "failed");
    assert_eq!(
        s.cancel(&b.id, Some(&id())).unwrap_err().code,
        "VALIDATION_FAILED"
    );
}

#[test]
fn a_source_modified_during_chunked_copy_is_never_committed() {
    let t = Root::new();
    let s = open(&t);
    let p = t.source("mutating.mp4", 4 * CHUNK);
    let selected = s.selected(vec![p.clone()]).unwrap();
    let weak = Arc::downgrade(&s);
    let edited = Arc::new(AtomicBool::new(false));
    let flag = edited.clone();
    let notify: Arc<dyn Fn(&str) + Send + Sync> = Arc::new(move |aid| {
        if let Some(s) = weak.upgrade() {
            if !aid.is_empty()
                && s.attempt(aid).unwrap().state == "copying"
                && !flag.swap(true, Ordering::SeqCst)
            {
                OpenOptions::new()
                    .write(true)
                    .open(&p)
                    .unwrap()
                    .set_len(8)
                    .unwrap();
            }
        }
    });
    let b = s.start(selected.token.as_deref().unwrap(), notify).unwrap();
    let result = wait(&s, &b.id);
    assert_eq!(
        result.items[0].error.as_ref().unwrap().code,
        "SOURCE_CHANGED"
    );
    assert!(s.lib.list(0, 200).unwrap().is_empty());
    assert!(fs::read_dir(s.lib.root.join("staging"))
        .unwrap()
        .next()
        .is_none());
}
