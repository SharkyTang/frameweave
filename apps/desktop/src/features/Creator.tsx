import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  Download,
  FilePenLine,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useWorkbench, requestUnavailable } from "../app/context";
import { DemoEntry, NewProjectButton } from "../app/Shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  PageTitle,
  SectionTitle,
  Tabs,
} from "../components/ui";
import { stages, type CreativeProject } from "../domain";
import { updateProject } from "../services";

const tabs = [
  { id: "brief", label: "创作简报" },
  { id: "script", label: "分段脚本" },
  { id: "storyboard", label: "分镜表" },
  { id: "checklist", label: "拍摄清单" },
  { id: "editing", label: "剪辑说明" },
];
export function Creator() {
  const c = useWorkbench();
  const [tab, setTab] = useState("brief");
  const project = c.workspace.projects.find((p) => p.id === c.route.id);
  const update = (next: CreativeProject) =>
    c.mutate((w) => updateProject(w, next));
  if (!project)
    return (
      <>
        <PageTitle
          eyebrow="CREATION STUDIO"
          title="创作导师"
          description="用自己的主题和表达，把观察转化为可拍摄的方案。"
        >
          <NewProjectButton />
        </PageTitle>
        {c.workspace.projects.length ? (
          <div className="project-grid">
            {c.workspace.projects.map((p) => (
              <Card key={p.id} className="project-card">
                <div className="project-icon">
                  <FilePenLine size={25} />
                </div>
                <Badge tone="purple">{p.stage}</Badge>
                <h2>{p.title}</h2>
                <p className="subtle">
                  {p.script.length} 段脚本 · {p.storyboard.length} 个分镜 ·
                  演示项目
                </p>
                <Button
                  tone="primary"
                  icon={ArrowRight}
                  onClick={() => c.navigate(`/creator/${p.id}`)}
                >
                  打开编辑器
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FilePenLine}
            title="给你的下一个作品，一份清楚的计划"
            description="简报、脚本、分镜与拍摄清单已经就位。当前可以编辑示例；个人项目与磁盘保存将在 D5 接入。"
          >
            <DemoEntry />
          </EmptyState>
        )}
      </>
    );
  const completed = project.checklist.filter((t) => t.done).length;
  return (
    <>
      <PageTitle
        eyebrow="MAKE SOMETHING ORIGINAL"
        title={project.title}
        description="示例创作编辑器 · 手动编写，所有变更只保留在当前会话。"
      >
        <Button
          icon={Sparkles}
          onClick={() => void requestUnavailable("creation", c.unavailable)}
        >
          AI 生成方案 <Badge>未接入</Badge>
        </Button>
        <Button icon={Save} onClick={() => c.nativeAction("save")}>
          保存说明
        </Button>
        <Button
          tone="primary"
          icon={Download}
          onClick={() =>
            c.unavailable(
              "创作包导出 · D5",
              "D5 将提供 Markdown / TXT 和分镜 CSV 的原生保存对话框。当前不会生成或下载假导出文件。",
            )
          }
        >
          导出创作包
        </Button>
      </PageTitle>
      <div className="creator-meta">
        <label className="stage-select">
          项目阶段
          <select
            aria-label="项目阶段"
            value={project.stage}
            onChange={(e) =>
              update({
                ...project,
                stage: e.target.value as CreativeProject["stage"],
              })
            }
          >
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <span className="session-save">
          <Check size={14} /> 会话内即时更新 · 未写入磁盘
        </span>
        <span className="subtle">修订 {project.revision}</span>
      </div>
      <div className="creator-grid">
        <Card className="editor-card">
          <Tabs label="创作编辑器" items={tabs} value={tab} onChange={setTab} />
          <div className="editor-body" role="tabpanel">
            {tab === "brief" && (
              <>
                <SectionTitle
                  title="把创作想法说清楚"
                  note="简报可以不完整。先写最想表达的一件事。"
                />
                <div className="brief-grid">
                  <Field label="项目标题">
                    <input
                      value={project.title}
                      onChange={(e) =>
                        update({ ...project, title: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="主题 / 核心表达">
                    <input
                      value={project.brief.topic}
                      placeholder="这支视频想让人记住什么？"
                      onChange={(e) =>
                        update({
                          ...project,
                          brief: { ...project.brief, topic: e.target.value },
                        })
                      }
                    />
                  </Field>
                  {(
                    [
                      {
                        key: "audience",
                        label: "给谁看",
                        placeholder: "目标受众",
                      },
                      {
                        key: "duration",
                        label: "目标时长",
                        placeholder: "例如 30 秒",
                      },
                      {
                        key: "platform",
                        label: "发布平台（可选）",
                        placeholder: "未指定也可以",
                      },
                      {
                        key: "style",
                        label: "表达风格",
                        placeholder: "清晰、温暖、有趣…",
                      },
                      {
                        key: "appearing",
                        label: "出镜意愿",
                        placeholder: "出镜 / 只拍双手 / 不出镜",
                      },
                      {
                        key: "equipment",
                        label: "可用设备",
                        placeholder: "手机、支架…",
                      },
                      {
                        key: "location",
                        label: "拍摄地点",
                        placeholder: "在什么地方拍摄？",
                      },
                      {
                        key: "team",
                        label: "制作方式",
                        placeholder: "独立 / 多人",
                      },
                    ] as const
                  ).map((field) => (
                    <Field key={field.key} label={field.label}>
                      <input
                        value={project.brief[field.key]}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          update({
                            ...project,
                            brief: {
                              ...project.brief,
                              [field.key]: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
                <div className="editor-next">
                  <Button
                    tone="primary"
                    icon={ArrowRight}
                    onClick={() => setTab("script")}
                  >
                    接着写脚本
                  </Button>
                </div>
              </>
            )}
            {tab === "script" && (
              <>
                <SectionTitle
                  title="用自己的话，讲自己的故事"
                  note="固定模板仅提供空白段落，不生成台词。"
                >
                  <Button
                    icon={Plus}
                    onClick={() =>
                      update({
                        ...project,
                        script: [
                          ...project.script,
                          {
                            id: `s-${crypto.randomUUID()}`,
                            name: `段落 ${project.script.length + 1}`,
                            duration: "",
                            text: "",
                            note: "",
                          },
                        ],
                      })
                    }
                  >
                    添加段落
                  </Button>
                </SectionTitle>
                {project.script.length ? (
                  project.script.map((s, i) => (
                    <div className="script-block" key={s.id}>
                      <div className="script-block-header">
                        <span className="number-dot">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <input
                          aria-label={`段落 ${i + 1} 名称`}
                          value={s.name}
                          onChange={(e) =>
                            update({
                              ...project,
                              script: project.script.map((row) =>
                                row.id === s.id
                                  ? { ...row, name: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                        <div className="duration-input">
                          <input
                            aria-label={`段落 ${i + 1} 估计时长`}
                            value={s.duration}
                            onChange={(e) =>
                              update({
                                ...project,
                                script: project.script.map((row) =>
                                  row.id === s.id
                                    ? { ...row, duration: e.target.value }
                                    : row,
                                ),
                              })
                            }
                          />
                          <span>秒 · 手填</span>
                        </div>
                        <IconButton
                          icon={Trash2}
                          label={`删除段落 ${i + 1}`}
                          onClick={() =>
                            update({
                              ...project,
                              script: project.script.filter(
                                (row) => row.id !== s.id,
                              ),
                            })
                          }
                        />
                      </div>
                      <Field label="旁白 / 对白">
                        <textarea
                          rows={3}
                          value={s.text}
                          placeholder="写下你真正想说的话…"
                          onChange={(e) =>
                            update({
                              ...project,
                              script: project.script.map((row) =>
                                row.id === s.id
                                  ? { ...row, text: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="备注">
                        <input
                          value={s.note}
                          onChange={(e) =>
                            update({
                              ...project,
                              script: project.script.map((row) =>
                                row.id === s.id
                                  ? { ...row, note: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                      </Field>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="先写下第一句话"
                    description="添加一个段落，或使用空白三段模板。"
                  >
                    <Button
                      onClick={() =>
                        update({
                          ...project,
                          script: ["提出问题", "展示过程", "给出结果"].map(
                            (name, i) => ({
                              id: `blank-${i}`,
                              name,
                              duration: "",
                              text: "",
                              note: "空白模板 · 手动填写",
                            }),
                          ),
                        })
                      }
                    >
                      使用空白模板
                    </Button>
                  </EmptyState>
                )}
              </>
            )}
            {tab === "storyboard" && (
              <>
                <SectionTitle
                  title="让每个想法，有一个镜头"
                  note="时长与景别由你计划，不自动识别镜头。"
                >
                  <Button
                    icon={Plus}
                    onClick={() =>
                      update({
                        ...project,
                        storyboard: [
                          ...project.storyboard,
                          {
                            id: `b-${crypto.randomUUID()}`,
                            duration: "",
                            shot: "",
                            visual: "",
                            dialogue: "",
                            props: "",
                          },
                        ],
                      })
                    }
                  >
                    添加分镜
                  </Button>
                </SectionTitle>
                <div
                  className="storyboard-table"
                  role="table"
                  aria-label="分镜表"
                >
                  <div className="storyboard-table-header" role="row">
                    <span>镜号</span>
                    <span>时长 / 景别</span>
                    <span>画面内容 / 台词</span>
                    <span>道具</span>
                    <span>顺序</span>
                  </div>
                  {project.storyboard.map((b, i) => (
                    <div className="storyboard-row" role="row" key={b.id}>
                      <span className="number-dot">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <input
                          aria-label={`分镜 ${i + 1} 时长`}
                          placeholder="计划时长（秒）"
                          value={b.duration}
                          onChange={(e) =>
                            update({
                              ...project,
                              storyboard: project.storyboard.map((row) =>
                                row.id === b.id
                                  ? { ...row, duration: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                        <input
                          aria-label={`分镜 ${i + 1} 景别`}
                          placeholder="景别 / 角度"
                          value={b.shot}
                          onChange={(e) =>
                            update({
                              ...project,
                              storyboard: project.storyboard.map((row) =>
                                row.id === b.id
                                  ? { ...row, shot: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                      </div>
                      <div>
                        <textarea
                          rows={2}
                          aria-label={`分镜 ${i + 1} 画面`}
                          placeholder="画面内容"
                          value={b.visual}
                          onChange={(e) =>
                            update({
                              ...project,
                              storyboard: project.storyboard.map((row) =>
                                row.id === b.id
                                  ? { ...row, visual: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                        <input
                          aria-label={`分镜 ${i + 1} 台词`}
                          placeholder="台词"
                          value={b.dialogue}
                          onChange={(e) =>
                            update({
                              ...project,
                              storyboard: project.storyboard.map((row) =>
                                row.id === b.id
                                  ? { ...row, dialogue: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                      </div>
                      <textarea
                        aria-label={`分镜 ${i + 1} 道具`}
                        rows={3}
                        placeholder="道具 / 拍摄提示"
                        value={b.props}
                        onChange={(e) =>
                          update({
                            ...project,
                            storyboard: project.storyboard.map((row) =>
                              row.id === b.id
                                ? { ...row, props: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                      <div className="row-order">
                        <IconButton
                          icon={ArrowUp}
                          label={`上移分镜 ${i + 1}`}
                          disabled={i === 0}
                          onClick={() => {
                            const rows = [...project.storyboard];
                            [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
                            update({ ...project, storyboard: rows });
                          }}
                        />
                        <IconButton
                          icon={ArrowDown}
                          label={`下移分镜 ${i + 1}`}
                          disabled={i === project.storyboard.length - 1}
                          onClick={() => {
                            const rows = [...project.storyboard];
                            [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
                            update({ ...project, storyboard: rows });
                          }}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`删除分镜 ${i + 1}`}
                          onClick={() =>
                            update({
                              ...project,
                              storyboard: project.storyboard.filter(
                                (row) => row.id !== b.id,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {!project.storyboard.length && (
                  <EmptyState
                    title="给想法一个具体画面"
                    description="添加第一个分镜，写下画面、台词和拍摄提示。"
                  />
                )}
              </>
            )}
            {tab === "checklist" && (
              <>
                <SectionTitle
                  title="开拍之前，准备好这些"
                  note={`${completed} / ${project.checklist.length} 项已勾选 · 示例会话`}
                />
                <div className="checklist">
                  {project.checklist.map((t) => (
                    <div
                      key={t.id}
                      className={`checklist-row ${t.done ? "done" : ""}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`完成事项：${t.text}`}
                        checked={t.done}
                        onChange={(e) =>
                          update({
                            ...project,
                            checklist: project.checklist.map((row) =>
                              row.id === t.id
                                ? { ...row, done: e.target.checked }
                                : row,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label="拍摄事项"
                        value={t.text}
                        onChange={(e) =>
                          update({
                            ...project,
                            checklist: project.checklist.map((row) =>
                              row.id === t.id
                                ? { ...row, text: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                      <IconButton
                        icon={Trash2}
                        label="删除拍摄事项"
                        onClick={() =>
                          update({
                            ...project,
                            checklist: project.checklist.filter(
                              (row) => row.id !== t.id,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  icon={Plus}
                  onClick={() =>
                    update({
                      ...project,
                      checklist: [
                        ...project.checklist,
                        {
                          id: `t-${crypto.randomUUID()}`,
                          text: "新的拍摄事项",
                          done: false,
                        },
                      ],
                    })
                  }
                >
                  添加事项
                </Button>
              </>
            )}
            {tab === "editing" && (
              <>
                <SectionTitle
                  title="为剪辑留一份清楚的说明"
                  note="记录镜头顺序、字幕要点、转场和声音想法。"
                />
                <Field label="剪辑说明">
                  <textarea
                    className="editing-text"
                    rows={14}
                    value={project.editing}
                    placeholder="你希望观众以什么顺序看到这些画面？"
                    onChange={(e) =>
                      update({ ...project, editing: e.target.value })
                    }
                  />
                </Field>
                <p className="subtle">
                  当前是文字计划，未接入视频时间线或自动成片。
                </p>
              </>
            )}
          </div>
        </Card>
        <aside className="creator-aside">
          <Card>
            <div className="mini-icon">
              <BookOpen size={19} />
            </div>
            <h3>这次想借鉴的方法</h3>
            {project.methodIds.length ? (
              project.methodIds.map((id) => {
                const method = c.workspace.methods.find((m) => m.id === id);
                return method ? (
                  <div className="reference-method" key={id}>
                    <strong>{method.title}</strong>
                    <p className="subtle">{method.scenario}</p>
                    <Badge>
                      {method.verified ? "用户已验证" : "待验证 · 示例"}
                    </Badge>
                  </div>
                ) : null;
              })
            ) : (
              <p className="subtle">从方法库选择一个适合这次创作的方法。</p>
            )}
            <Button
              tone="ghost"
              icon={ArrowRight}
              onClick={() => c.navigate("/methods")}
            >
              查看方法库
            </Button>
          </Card>
          <Card>
            <h3>参考是起点</h3>
            {project.referenceIds.map((id) => {
              const a = c.workspace.assets.find((item) => item.id === id);
              return a ? (
                <button
                  key={id}
                  className="reference-link"
                  onClick={() => c.navigate(`/analysis/${id}`)}
                >
                  <span>{a.title}</span>
                  <ArrowRight size={15} />
                </button>
              ) : null;
            })}
            {!project.referenceIds.length && (
              <p className="subtle">
                这是一个空白项目，没有自动复制参考片的内容。
              </p>
            )}
            <p className="subtle">
              保留结构和方法，用自己的主题、镜头和台词表达。
            </p>
          </Card>
          <div className="source-note">
            <h4>你的编辑始终优先</h4>
            <p>
              示例改动即时保留在当前会话，不会因切换标签页而被初始示例覆盖。退出应用后恢复初始内容。
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
