import { useState } from "react";
import { useWorkbench } from "./context";
import { personalMedia } from "../adapters/desktop";
import {
  nativeErrorMessage,
  importTerminal,
  type ImportState,
} from "../domain";
import { Badge, Button, Modal } from "../components/ui";
const stateLabel: Record<ImportState, string> = {
  queued: "等待复制",
  copying: "正在复制",
  validating: "核验副本",
  staged: "准备入库",
  committing: "正在完成入库",
  imported: "已入库 · 播放待验证",
  duplicate: "已在素材库",
  repaired: "已修复管理副本",
  failed: "导入失败",
  cancelled: "已取消",
  interrupted: "上次导入中断",
  needs_review: "保留待检查",
};
const bytes = (n: number) =>
  n >= 1024 ** 3
    ? `${(n / 1024 ** 3).toFixed(2)} GiB`
    : n >= 1024 ** 2
      ? `${(n / 1024 ** 2).toFixed(1)} MiB`
      : `${n.toLocaleString()} 字节`;
export function ImportDialog() {
  const c = useWorkbench();
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");
  const choose = async () => {
    if (choosing || c.batch?.active) return;
    setChoosing(true);
    setError("");
    try {
      const selection = await personalMedia.choose();
      if (!selection.token) return;
      const result = await personalMedia.start(selection.token);
      c.setBatch(result);
      if (!result.active) await c.refreshPersonal();
    } catch (e) {
      setError(nativeErrorMessage(e));
    } finally {
      setChoosing(false);
    }
  };
  return (
    <Modal
      title="导入本地视频"
      onClose={() => {
        if (!choosing) c.setDialog(null);
      }}
    >
      <p className="dialog-paragraph">
        视频将复制到映构资料库，占用额外空间；原文件不会移动或删除。MP4 / MOV
        是候选容器，已入库与可播放分别核验。
      </p>
      <p className="subtle">
        一次最多 {c.libraryInfo?.maxFiles ?? 20} 个，单文件最多 5
        GiB。顺序复制；取消保留已经成功的素材。失败重试需重新选择。
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="import-items">
        {c.batch?.items.map((item) => (
          <div className="import-item" key={item.id}>
            <strong>{item.filename}</strong>
            <Badge
              tone={
                item.state === "failed" || item.state === "needs_review"
                  ? "amber"
                  : "purple"
              }
            >
              {!c.batch?.active && !importTerminal(item.state)
                ? "收尾未确认，请重启核对"
                : stateLabel[item.state]}
              {item.state === "duplicate" && item.archived ? " · 已归档" : ""}
            </Badge>
            {item.state === "copying" && (
              <progress
                aria-label={`复制进度：${item.filename}`}
                value={item.bytesCopied}
                max={item.totalBytes || 1}
              />
            )}
            <small className="subtle">
              {bytes(item.bytesCopied)} / {bytes(item.totalBytes)}
            </small>
            {item.error && <p role="alert">{item.error.message}</p>}
            <div className="stack-actions">
              {item.assetId && (
                <Button
                  onClick={() => {
                    c.setDialog(null);
                    c.navigate(`/analysis/${item.assetId}`);
                  }}
                >
                  打开素材
                </Button>
              )}
              {["queued", "copying", "validating"].includes(item.state) && (
                <Button
                  onClick={() =>
                    void personalMedia
                      .cancel(c.batch!.id, item.id)
                      .catch((e) => setError(nativeErrorMessage(e)))
                  }
                >
                  取消此项
                </Button>
              )}
              {["failed", "cancelled", "interrupted"].includes(item.state) && (
                <Button
                  disabled={choosing || c.batch?.active}
                  onClick={() => void choose()}
                >
                  重新选择此文件
                </Button>
              )}
              {item.state === "needs_review" && (
                <span className="subtle">
                  残留已保留。关闭应用后依据交接检查；不会删除或覆盖未知文件。
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <Button onClick={() => c.setDialog(null)} disabled={choosing}>
          {c.batch?.active ? "后台继续导入" : "关闭"}
        </Button>
        {c.batch?.active ? (
          <Button
            tone="danger"
            onClick={() =>
              void personalMedia
                .cancel(c.batch!.id)
                .catch((e) => setError(nativeErrorMessage(e)))
            }
          >
            取消未完成导入
          </Button>
        ) : (
          <Button
            tone="primary"
            disabled={choosing}
            onClick={() => void choose()}
          >
            {choosing ? "等待原生选择…" : "选择视频并复制"}
          </Button>
        )}
      </div>
      {c.batch &&
        !c.batch.active &&
        c.batch.items.every((i) => importTerminal(i.state)) && (
          <p className="subtle">
            每项结果来自本机资料库。打开视频后才核验实际播放。
          </p>
        )}
    </Modal>
  );
}
