import { useState } from "react";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  Edit3,
  Plus,
  Search,
} from "lucide-react";
import { useWorkbench } from "../app/context";
import { DemoEntry } from "../app/Shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageTitle,
  SectionTitle,
} from "../components/ui";
import { timeLabel, type MethodCard } from "../domain";
import { updateProject } from "../services";

export function Methods() {
  const c = useWorkbench();
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [edit, setEdit] = useState<MethodCard>();
  const [useId, setUseId] = useState<string>();
  const [projectId, setProjectId] = useState("");
  const methods = c.workspace.methods.filter(
    (m) =>
      m.archived === archived &&
      `${m.title} ${m.scenario} ${m.tags.join(" ")}`.includes(query.trim()),
  );
  const create = () =>
    c.space === "demo"
      ? setEdit({
          id: `demo-${crypto.randomUUID()}`,
          title: "",
          scenario: "",
          steps: "",
          caution: "",
          tags: [],
          sourceTitle: "演示空间手动新建",
          verified: false,
          archived: false,
        })
      : c.unavailable(
          "个人方法卡 · D5",
          "当前可以查看、编辑和引用示例方法。个人方法的持久化将在 D5 接入。",
        );
  return (
    <>
      <PageTitle
        eyebrow="YOUR CREATIVE PLAYBOOK"
        title="创作方法库"
        description="把一次具体观察，变成下一次可以使用的方法。"
      >
        <Button tone="primary" icon={Plus} onClick={create}>
          新建方法卡
        </Button>
      </PageTitle>
      <div className="library-toolbar">
        <div className="method-filter">
          <Button
            tone={archived ? "ghost" : "secondary"}
            onClick={() => setArchived(false)}
          >
            全部方法
          </Button>
          <Button
            tone={archived ? "secondary" : "ghost"}
            icon={Archive}
            onClick={() => setArchived(true)}
          >
            已归档
          </Button>
        </div>
        <label className="search-input">
          <Search size={16} />
          <input
            aria-label="搜索方法"
            placeholder="搜索方法、场景或标签…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {methods.length ? (
        <div className="methods-grid">
          {methods.map((m) => (
            <Card className="method-card" key={m.id}>
              <div className="method-card-head">
                <div className="mini-icon">
                  <BookOpen size={22} />
                </div>
                <Badge tone={m.verified ? "green" : "amber"}>
                  {m.verified ? "用户已验证" : "待验证 · 示例"}
                </Badge>
              </div>
              <h2>{m.title}</h2>
              <p className="subtle">{m.scenario || "尚未填写适用场景"}</p>
              <div className="method-steps">{m.steps}</div>
              <div className="method-caution">
                <strong>使用边界</strong>
                <p>{m.caution || "为这个方法补充注意事项。"}</p>
              </div>
              <div className="tag-row">
                {m.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                className="method-source"
                onClick={() =>
                  m.assetId
                    ? c.navigate(`/analysis/${m.assetId}`)
                    : c.unavailable(
                        "手动新建的方法",
                        "此卡片没有关联参考素材，来源为演示空间人工输入。",
                      )
                }
              >
                <span>
                  来源：{m.sourceTitle}
                  {m.timeMs !== undefined ? ` · ${timeLabel(m.timeMs)}` : ""}
                </span>
                <ArrowRight size={13} />
              </button>
              <div className="method-actions">
                <Button icon={Edit3} onClick={() => setEdit({ ...m })}>
                  编辑
                </Button>
                <Button
                  tone="primary"
                  icon={Plus}
                  onClick={() => {
                    setUseId(m.id);
                    setProjectId(c.workspace.projects[0]?.id ?? "");
                  }}
                >
                  用于创作
                </Button>
                <Button
                  tone="ghost"
                  icon={Archive}
                  onClick={() =>
                    c.mutate((w) => ({
                      ...w,
                      methods: w.methods.map((item) =>
                        item.id === m.id
                          ? { ...item, archived: !item.archived }
                          : item,
                      ),
                    }))
                  }
                >
                  {m.archived ? "恢复" : "归档"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={
            c.space === "personal"
              ? "让你的学习，逐渐成为方法"
              : "没有匹配的方法卡"
          }
          description={
            c.space === "personal"
              ? "从学习笔记提炼具体做法，保留来源。可以先查看示例方法如何用于创作。"
              : "试试其他关键词，或创建一张新的示例方法卡。"
          }
        >
          {c.space === "personal" ? (
            <DemoEntry />
          ) : (
            <Button onClick={create}>新建示例方法</Button>
          )}
        </EmptyState>
      )}
      <div className="page-note">
        保存方法是整理知识，不代表训练模型或 AI 已掌握你的风格。
      </div>
      {edit && (
        <Modal title="编辑示例方法卡" onClose={() => setEdit(undefined)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              c.mutate((w) => ({
                ...w,
                methods: w.methods.some((m) => m.id === edit.id)
                  ? w.methods.map((m) => (m.id === edit.id ? edit : m))
                  : [edit, ...w.methods],
              }));
              setEdit(undefined);
            }}
          >
            <Field label="方法标题">
              <input
                required
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </Field>
            <Field label="适用场景">
              <input
                value={edit.scenario}
                onChange={(e) => setEdit({ ...edit, scenario: e.target.value })}
              />
            </Field>
            <Field label="具体做法">
              <textarea
                rows={4}
                value={edit.steps}
                onChange={(e) => setEdit({ ...edit, steps: e.target.value })}
              />
            </Field>
            <Field label="注意事项">
              <textarea
                rows={2}
                value={edit.caution}
                onChange={(e) => setEdit({ ...edit, caution: e.target.value })}
              />
            </Field>
            <Field label="标签（逗号分隔）">
              <input
                value={edit.tags.join("，")}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    tags: e.target.value
                      .split(/[,，]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={edit.verified}
                onChange={(e) =>
                  setEdit({ ...edit, verified: e.target.checked })
                }
              />
              我在自己的练习中验证过这个方法
            </label>
            <p className="subtle">更新演示会话，不写入个人数据库。</p>
            <div className="modal-actions">
              <Button onClick={() => setEdit(undefined)}>取消</Button>
              <Button
                tone="primary"
                type="submit"
                disabled={!edit.title.trim()}
              >
                更新示例方法
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {useId && (
        <Modal title="把方法用于创作项目" onClose={() => setUseId(undefined)}>
          <div className="form-stack">
            {c.workspace.projects.length ? (
              <>
                <Field label="选择示例项目">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    {c.workspace.projects.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="subtle">仅增加参考关系，不自动改写你的脚本。</p>
                <div className="modal-actions">
                  <Button onClick={() => setUseId(undefined)}>取消</Button>
                  <Button
                    tone="primary"
                    icon={Check}
                    onClick={() => {
                      const p = c.workspace.projects.find(
                        (item) => item.id === projectId,
                      );
                      if (p)
                        c.mutate((w) =>
                          updateProject(w, {
                            ...p,
                            methodIds: [...new Set([...p.methodIds, useId])],
                          }),
                        );
                      setUseId(undefined);
                      c.navigate(`/creator/${projectId}`);
                    }}
                  >
                    引用方法并打开项目
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                title="先创建一个示例项目"
                description="方法只会关联到你选择的项目。"
              >
                <Button
                  onClick={() => {
                    setUseId(undefined);
                    c.newProject();
                  }}
                >
                  新建项目
                </Button>
              </EmptyState>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
