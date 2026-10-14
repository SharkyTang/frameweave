import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Film,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useWorkbench, requestUnavailable } from "../app/context";
import { DemoEntry } from "../app/Shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Modal,
  PageTitle,
  Poster,
  SectionTitle,
  Tabs,
} from "../components/ui";
import { timeLabel, type LearningNote } from "../domain";

export function Analysis() {
  const c = useWorkbench();
  const asset = c.workspace.assets.find((a) => a.id === c.route.id);
  const [tab, setTab] = useState("notes");
  const [currentMs, setCurrentMs] = useState(0);
  const [playError, setPlayError] = useState(false);
  const [note, setNote] = useState<LearningNote>();
  const [noteOpen, setNoteOpen] = useState(false);
  const [text, setText] = useState("");
  const [dimension, setDimension] = useState("开头");
  const videoRef = useRef<HTMLVideoElement>(null);
  const notes = c.workspace.notes
    .filter((n) => n.assetId === asset?.id)
    .sort((a, b) => a.timeMs - b.timeMs);
  const openNote = (existing?: LearningNote) => {
    setNote(existing);
    setText(existing?.text ?? "");
    setDimension(existing?.dimension ?? "开头");
    setNoteOpen(true);
  };
  const seek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time / 1000;
    setCurrentMs(time);
  };
  if (!asset)
    return (
      <>
        <PageTitle
          eyebrow="VIDEO LEARNING SPACE"
          title="视频拆解"
          description="带着一个问题观看，让每条笔记都有上下文。"
        />
        <EmptyState
          title={
            c.space === "personal"
              ? "选择一条参考，开始认真观察"
              : c.route.id
                ? "这条示例素材不存在"
                : "今天想学习哪条参考？"
          }
          description={
            c.space === "personal"
              ? "真实视频与时间点笔记将在 D3 / D4 接入。可先体验自制短片与手动编写的拆解。"
              : "从素材库选择参考，或直接打开工作台自制短片。"
          }
        >
          {c.space === "personal" ? (
            <DemoEntry />
          ) : (
            <Button
              tone="primary"
              icon={Film}
              onClick={() => c.navigate("/analysis/demo-shapes")}
            >
              打开自制示例
            </Button>
          )}
          <Button onClick={() => c.navigate("/library")}>选择素材</Button>
        </EmptyState>
      </>
    );
  return (
    <>
      <div className="back-row">
        <Button
          tone="ghost"
          icon={ArrowLeft}
          onClick={() => c.navigate("/library")}
        >
          灵感素材库
        </Button>
        <Badge tone="amber">自制示例 / 非 AI 结果</Badge>
      </div>
      <PageTitle
        eyebrow="WATCH WITH A QUESTION"
        title={asset.title}
        description={asset.learningGoal || "为本次观看写下一个学习目标。"}
      >
        <Button
          icon={Sparkles}
          onClick={() => void requestUnavailable("analysis", c.unavailable)}
        >
          AI 深度拆解 <Badge>未接入</Badge>
        </Button>
        <Button
          tone="primary"
          icon={Plus}
          onClick={() => c.newProject(asset.id)}
        >
          从参考开始创作
        </Button>
      </PageTitle>
      <div className="analysis-grid">
        <div className="analysis-main">
          <Card className="player-card">
            <div className="player-area">
              {asset.status === "available" && !playError ? (
                <video
                  key={asset.id}
                  ref={videoRef}
                  controls
                  playsInline
                  preload="metadata"
                  src="./demo/three-scenes.mp4"
                  onTimeUpdate={(e) =>
                    setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))
                  }
                  onError={() => setPlayError(true)}
                  aria-label="12 秒工作台自制几何示例视频"
                />
              ) : (
                <div className="player-missing">
                  <Film size={38} />
                  <h3>
                    {asset.status === "link_only"
                      ? "未关联本地视频"
                      : playError
                        ? "示例视频暂时无法播放"
                        : "示例：媒体文件缺失"}
                  </h3>
                  <p>
                    {asset.status === "link_only"
                      ? "链接记录不代表已经下载视频。"
                      : "学习目标与文字笔记仍然可以查看。"}
                  </p>
                  <Button
                    onClick={() =>
                      c.unavailable(
                        "重新关联媒体 · D3",
                        "D3 将提供原生文件选择与受管理媒体路径。当前缺失状态是明确标识的示例。",
                      )
                    }
                  >
                    查看重新关联说明
                  </Button>
                </div>
              )}
            </div>
            <div className="player-caption">
              <span>
                <Badge tone="purple">自制演示</Badge> 12 秒 · 方块 / 三个框 /
                圆环
              </span>
              <label className="speed-select">
                倍速
                <select
                  aria-label="播放倍速"
                  defaultValue="1"
                  onChange={(e) => {
                    if (videoRef.current)
                      videoRef.current.playbackRate = Number(e.target.value);
                  }}
                >
                  <option value="0.5">0.5×</option>
                  <option value="1">1×</option>
                  <option value="1.5">1.5×</option>
                  <option value="2">2×</option>
                </select>
              </label>
            </div>
          </Card>
          <div className="timeline-notes">
            <span className="subtle">手动时间标记</span>
            {notes.map((n) => (
              <button key={n.id} onClick={() => seek(n.timeMs)}>
                {timeLabel(n.timeMs)} <span>{n.dimension}</span>
              </button>
            ))}
          </div>
          <Card className="notes-card">
            <div className="notes-heading">
              <Tabs
                label="学习内容"
                value={tab}
                onChange={setTab}
                items={[
                  { id: "notes", label: "时间点笔记" },
                  { id: "structure", label: "手动拆解" },
                  { id: "transcript", label: "文案 / 字幕" },
                ]}
              />
              <Button icon={Plus} onClick={() => openNote()}>
                添加笔记
              </Button>
            </div>
            {tab === "notes" && (
              <div className="notes-list">
                {notes.length ? (
                  notes.map((n) => (
                    <article key={n.id} className="learning-note">
                      <button
                        className="time-chip"
                        onClick={() => seek(n.timeMs)}
                      >
                        {timeLabel(n.timeMs)}
                      </button>
                      <div className="note-text">
                        <div>
                          <Badge>{n.dimension}</Badge>
                          <span className="subtle">
                            {n.origin === "demo"
                              ? "手动编写示例"
                              : "演示空间手动笔记"}
                          </span>
                        </div>
                        <button
                          className="note-edit"
                          onClick={() => openNote(n)}
                        >
                          {n.text}
                        </button>
                        <button
                          className="text-link"
                          onClick={() => {
                            c.mutate((w) => ({
                              ...w,
                              methods: [
                                {
                                  id: `demo-${crypto.randomUUID()}`,
                                  title: `${n.dimension}：我的观察`,
                                  scenario: "",
                                  steps: n.text,
                                  caution:
                                    "来自演示笔记，使用前需在自己的创作中验证。",
                                  tags: [n.dimension],
                                  assetId: asset.id,
                                  sourceTitle: asset.title,
                                  timeMs: n.timeMs,
                                  verified: false,
                                  archived: false,
                                },
                                ...w.methods,
                              ],
                            }));
                            c.navigate("/methods");
                          }}
                        >
                          保存为示例方法 <ArrowRight size={13} />
                        </button>
                      </div>
                      <IconButton
                        icon={Trash2}
                        label="删除示例笔记"
                        onClick={() =>
                          c.mutate((w) => ({
                            ...w,
                            notes: w.notes.filter((item) => item.id !== n.id),
                          }))
                        }
                      />
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title="写下第一个观察"
                    description="暂停在一个值得学习的画面，记录它为什么有效。"
                  />
                )}
              </div>
            )}
            {tab === "structure" && (
              <div className="structure-cards">
                {[
                  {
                    t: "观察",
                    content:
                      "0–4 秒：QUESTION 与紫色方块。4–8 秒：PROCESS 与三个框。8–12 秒：RESULT 与圆环。",
                  },
                  {
                    t: "推测",
                    content:
                      "三个阶段让信息更容易跟随。这是人为解释，没有进行效果或观众数据验证。",
                  },
                  {
                    t: "建议",
                    content:
                      "借鉴三段结构，用自己的主题和实际拍摄画面替换几何图形。",
                  },
                ].map((item) => (
                  <div key={item.t}>
                    <Badge tone="purple">{item.t} · 示例</Badge>
                    <p>{item.content}</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "transcript" && (
              <EmptyState
                icon={FileText}
                title="这份自制示例没有字幕"
                description="短片没有语音，不生成假字幕或时间戳。D4 将支持导入你已有的 SRT / TXT。"
              >
                <Button
                  onClick={() =>
                    c.unavailable(
                      "文案 / 字幕导入 · D4",
                      "D4 支持原生选择 SRT / TXT、保留原文与人工修订。不调用下载插件或语音识别。",
                    )
                  }
                >
                  查看导入说明
                </Button>
              </EmptyState>
            )}
          </Card>
        </div>
        <aside className="analysis-aside">
          <Card>
            <SectionTitle title="本次学习目标" />
            <Field label="带着什么问题观看？">
              <textarea
                rows={4}
                value={asset.learningGoal}
                onChange={(e) =>
                  c.mutate((w) => ({
                    ...w,
                    assets: w.assets.map((a) =>
                      a.id === asset.id
                        ? { ...a, learningGoal: e.target.value }
                        : a,
                    ),
                  }))
                }
              />
            </Field>
            <p className="subtle">示例编辑仅在当前会话保留。</p>
          </Card>
          <Card>
            <div className="mini-icon">
              <BookOpen size={19} />
            </div>
            <h3>学到的方法，带进创作。</h3>
            <p className="subtle">把具体观察整理为方法卡，保留来源与时间点。</p>
            <Button
              tone="ghost"
              icon={ArrowRight}
              onClick={() => c.navigate("/methods")}
            >
              打开创作方法库
            </Button>
          </Card>
          <div className="source-note">
            <h4>关于这份示例</h4>
            <p>{asset.description}</p>
            <p>
              短片由本工程生成，内容与笔记对应。没有调用
              AI，也没有读取你的私人视频。
            </p>
          </div>
        </aside>
      </div>
      {noteOpen && (
        <Modal
          title={note ? "编辑示例笔记" : `记录观察 · ${timeLabel(currentMs)}`}
          onClose={() => setNoteOpen(false)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const entry: LearningNote = {
                id: note?.id ?? `demo-${crypto.randomUUID()}`,
                assetId: asset.id,
                timeMs:
                  note?.timeMs ??
                  Math.min(currentMs, asset.durationMs ?? currentMs),
                dimension,
                text: text.trim(),
                origin: "user_authored",
              };
              c.mutate((w) => ({
                ...w,
                notes: note
                  ? w.notes.map((n) => (n.id === note.id ? entry : n))
                  : [...w.notes, entry],
              }));
              setNoteOpen(false);
            }}
          >
            <Field label="拆解维度">
              <select
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
              >
                {[
                  "开头",
                  "结构",
                  "画面 / 镜头",
                  "节奏",
                  "声音",
                  "可复用方法",
                ].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="观察内容">
              <textarea
                required
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="描述你看到的内容，再写下自己的理解。"
              />
            </Field>
            <p className="subtle">这条笔记只更新演示空间，退出后不会保留。</p>
            <div className="modal-actions">
              <Button onClick={() => setNoteOpen(false)}>取消</Button>
              <Button tone="primary" type="submit" disabled={!text.trim()}>
                更新示例笔记
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
