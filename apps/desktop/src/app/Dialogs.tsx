import { useState } from "react";
import { ArrowRight, FilePlus, Search } from "lucide-react";
import { ImportDialog } from "./ImportDialog";
import { useWorkbench } from "./context";
import { shell } from "../adapters/desktop";
import { workspaceSearch } from "../services";
import { Badge, Button, Field, Modal } from "../components/ui";

export function Dialogs() {
  const c = useWorkbench();
  const [title, setTitle] = useState("");
  const [quitting, setQuitting] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = c.dialog;
  if (!dialog) return null;
  if (dialog.type === "unavailable")
    return (
      <Modal title={dialog.title} onClose={() => c.setDialog(null)}>
        <div className="unavailable-body">
          <Badge tone="amber">当前未实现 / 未接入</Badge>
          <p>{dialog.text}</p>
          <div className="modal-actions">
            <Button onClick={() => c.setDialog(null)}>知道了</Button>
            {c.space === "personal" && (
              <Button tone="primary" onClick={() => c.changeSpace("demo")}>
                体验示例空间
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  if (dialog.type === "newProject")
    return (
      <Modal title="新建示例创作项目" onClose={() => c.setDialog(null)}>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            c.createProject(title || "我的新创作练习", dialog.referenceId);
            setTitle("");
          }}
        >
          <Badge tone="amber">仅演示 · 当前会话</Badge>
          <Field label="项目标题">
            <input
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="我的新创作练习"
            />
          </Field>
          <p className="subtle">
            {dialog.referenceId
              ? "项目会保留参考关系，使用空白简报和脚本，不复制参考片内容。"
              : "从空白简报、脚本和分镜开始，使用自己的表达。"}{" "}
            退出应用后不会保留。
          </p>
          <div className="modal-actions">
            <Button onClick={() => c.setDialog(null)}>取消</Button>
            <Button tone="primary" type="submit" icon={FilePlus}>
              创建示例项目
            </Button>
          </div>
        </form>
      </Modal>
    );
  if (dialog.type === "import") return <ImportDialog />;
  if (dialog.type === "leave")
    return (
      <Modal title="素材资料尚未保存" onClose={() => c.setDialog(null)}>
        <p className="dialog-paragraph">
          输入还在当前表单中。继续编辑可保存；离开会放弃未提交的资料。
        </p>
        <div className="modal-actions">
          <Button onClick={() => c.setDialog(null)}>继续编辑</Button>
          <Button
            tone="danger"
            onClick={() => {
              c.setEditing(false, false);
              c.setDialog(null);
              dialog.proceed();
            }}
          >
            放弃未保存资料并离开
          </Button>
        </div>
      </Modal>
    );
  if (dialog.type === "quit")
    return (
      <Modal
        title={c.batch?.active ? "导入进行中，退出前确认" : "退出前确认"}
        onClose={() => {
          if (!quitting) c.setDialog(null);
        }}
      >
        <p className="dialog-paragraph">
          {c.batch?.active
            ? "可以继续导入，或取消未完成的导入并退出。正在完成入库的素材会先安全收尾，已经成功的素材保留。"
            : "已经保存的个人素材会保留。"}{" "}
          {c.draftDirty
            ? "当前素材表单有未保存输入，确认退出将放弃这部分输入。"
            : ""}{" "}
          {c.dirty && !c.draftDirty
            ? "示例有变更，退出后恢复初始示例；个人资料不受影响。"
            : ""}
        </p>
        {c.saving && (
          <p role="status">正在保存资料，请等待本机确认后再退出。</p>
        )}
        <div className="modal-actions">
          <Button disabled={quitting} onClick={() => c.setDialog(null)}>
            {c.batch?.active ? "继续导入" : "继续编辑"}
          </Button>
          <Button
            tone="danger"
            disabled={quitting || c.saving}
            onClick={() => {
              setQuitting(true);
              void shell.quit().catch(() => {
                setQuitting(false);
                c.notify("退出安全收尾失败，请重试。");
              });
            }}
          >
            {quitting
              ? "正在安全收尾…"
              : c.batch?.active
                ? "取消未完成导入并退出"
                : c.draftDirty
                  ? "放弃未保存资料并退出"
                  : "放弃示例变更并退出"}
          </Button>
        </div>
      </Modal>
    );
  if (dialog.type === "reset")
    return (
      <Modal title="恢复初始示例？" onClose={() => c.setDialog(null)}>
        <p className="dialog-paragraph">
          本次演示编辑将被替换。只影响演示空间，不清空个人资料，也不操作外部文件。
        </p>
        <div className="modal-actions">
          <Button onClick={() => c.setDialog(null)}>取消</Button>
          <Button tone="primary" onClick={() => void c.resetDemo()}>
            恢复示例
          </Button>
        </div>
      </Modal>
    );
  const commands = [
    { title: "打开灵感素材库", path: "/library" },
    { title: "打开创作导师", path: "/creator" },
    { title: "打开设置", path: "/settings" },
  ];
  const results = workspaceSearch(c.workspace, query);
  return (
    <Modal
      title="搜索与命令"
      onClose={() => {
        c.setDialog(null);
        setQuery("");
      }}
    >
      <label className="command-input">
        <Search size={19} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="查找本地素材、项目或方法…"
          aria-label="搜索与命令"
        />
      </label>
      <div className="command-results">
        {results.length > 0 && (
          <p className="eyebrow">
            {c.space === "demo" ? "演示资料" : "本地资料"}
          </p>
        )}
        {results.slice(0, 10).map((result) => (
          <button
            key={result.id}
            onClick={() => {
              c.setDialog(null);
              c.navigate(result.path);
              setQuery("");
            }}
          >
            <span>
              {result.title}
              <small>{result.kind}</small>
            </span>
            <ArrowRight size={15} />
          </button>
        ))}
        <p className="eyebrow">页面命令</p>
        {commands
          .filter((cmd) => cmd.title.includes(query))
          .map((cmd) => (
            <button
              key={cmd.path}
              onClick={() => {
                c.setDialog(null);
                c.navigate(cmd.path);
                setQuery("");
              }}
            >
              <span>{cmd.title}</span>
              <ArrowRight size={15} />
            </button>
          ))}
        {query && !results.length && (
          <p className="subtle command-empty">
            没有匹配的资料。当前个人空间为空。
          </p>
        )}
      </div>
    </Modal>
  );
}
