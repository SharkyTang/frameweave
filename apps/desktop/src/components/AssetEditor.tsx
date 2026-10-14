import { useEffect, useRef, useState } from "react";
import { useWorkbench } from "../app/context";
import { NativeError, personalMedia } from "../adapters/desktop";
import { assetPatch, nativeErrorMessage, type VideoAsset } from "../domain";
import { Badge, Button, Field } from "./ui";
export function AssetEditor({
  asset,
  compact = false,
}: {
  asset: VideoAsset;
  compact?: boolean;
}) {
  const c = useWorkbench();
  const [draft, setDraft] = useState(() => assetPatch(asset));
  const [tagText, setTagText] = useState(asset.tags.join("，"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    draft.title !== asset.title ||
    draft.description !== asset.description ||
    draft.learningGoal !== asset.learningGoal ||
    tagText !== asset.tags.join("，");
  const action = useRef<() => void>(undefined);
  const alive = useRef(true);
  const save = async () => {
    if (busy || c.composing.current) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const a = await c.saveAsset({
        ...draft,
        tags: tagText
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (alive.current) {
        setDraft(assetPatch(a));
        setTagText(a.tags.join("，"));
        setConflict(false);
        setSaved(true);
        c.setEditing(false, false);
        c.notify("素材资料已保存到本机");
      }
    } catch (e) {
      if (alive.current) {
        setError(nativeErrorMessage(e));
        setConflict(e instanceof NativeError && e.code === "REVISION_CONFLICT");
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  action.current = () => void save();
  useEffect(() => {
    c.setEditing(dirty, busy, () => action.current?.());
  }, [dirty, busy, c.setEditing]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      c.setEditing(false, false);
    };
  }, [c.setEditing]);
  // Keep draft input on errors/conflicts; follow external changes only while the form is clean.
  useEffect(() => {
    if (!dirty && !busy) {
      setDraft(assetPatch(asset));
      setTagText(asset.tags.join("，"));
    }
  }, [asset.revision]);
  const changed = () => {
    setSaved(false);
    setError("");
  };
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!c.composing.current) void save();
      }}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing && e.key === "Enter") e.preventDefault();
      }}
    >
      {!compact && (
        <>
          <Badge tone="green">个人素材 · 本机资料</Badge>
          <Field label="标题">
            <input
              value={draft.title}
              maxLength={200}
              disabled={busy}
              onChange={(e) => {
                changed();
                setDraft((d) => ({ ...d, title: e.target.value }));
              }}
            />
          </Field>
          <Field label="标签" hint="以中文或英文逗号分隔；最多20个">
            <input
              value={tagText}
              disabled={busy}
              onChange={(e) => {
                changed();
                setTagText(e.target.value);
              }}
            />
          </Field>
          <Field label="备注">
            <textarea
              rows={3}
              value={draft.description}
              maxLength={4000}
              disabled={busy}
              onChange={(e) => {
                changed();
                setDraft((d) => ({ ...d, description: e.target.value }));
              }}
            />
          </Field>
        </>
      )}
      <Field label={compact ? "带着什么问题观看？" : "学习目标"}>
        <textarea
          rows={3}
          value={draft.learningGoal}
          maxLength={4000}
          disabled={busy}
          onChange={(e) => {
            changed();
            setDraft((d) => ({ ...d, learningGoal: e.target.value }));
          }}
        />
      </Field>
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <Button
          disabled={busy}
          onClick={() =>
            void personalMedia
              .getAsset(asset.id)
              .then((a) => {
                setDraft((d) => ({ ...d, expectedRevision: a.revision ?? 0 }));
                setError(
                  "已读取最新修订，输入已保留。再次保存将按你的输入更新资料。",
                );
                setConflict(false);
              })
              .catch((e) => setError(nativeErrorMessage(e)))
          }
        >
          读取最新修订，保留输入
        </Button>
      )}
      <div className="stack-actions">
        <Button type="submit" tone="primary" disabled={busy || !dirty}>
          {busy ? "正在保存…" : "保存素材资料"}
        </Button>
        <span className="subtle" role="status">
          {busy
            ? "等待本机确认"
            : dirty
              ? "有未保存资料"
              : saved
                ? "已保存到本机"
                : "资料已入库"}
        </span>
      </div>
      <p className="subtle">只保存素材资料。字幕与时间点笔记将在 D4 开放。</p>
    </form>
  );
}
