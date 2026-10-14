import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clapperboard,
  FolderOpen,
  Lightbulb,
  Link,
  Play,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { useWorkbench } from "../app/context";
import { DemoEntry, NewProjectButton } from "../app/Shell";
import {
  AssetCard,
  Badge,
  Button,
  Card,
  PageTitle,
  SectionTitle,
} from "../components/ui";

export function Dashboard() {
  const c = useWorkbench();
  const w = c.workspace;
  const project = w.projects.find(
    (p) => !["待复盘", "已归档"].includes(p.stage),
  );
  const pending = w.projects.flatMap((p) =>
    p.checklist.filter((t) => !t.done).map((t) => ({ ...t, project: p })),
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR CREATIVE DESK"
        title={
          c.space === "demo"
            ? "让下一个好想法，成为作品。"
            : "你好，开始你的下一次创作。"
        }
        description="从值得学习的参考，到属于自己的表达。一次只推进一小步。"
      >
        <Button icon={Upload} onClick={() => c.nativeAction("import")}>
          导入参考素材
        </Button>
        <NewProjectButton />
      </PageTitle>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <Card className="hero-card">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="tiny-line" />
                {project ? "继续创作" : "从一个灵感开始"}
              </div>
              <h2>{project?.title ?? "你的创作空间，准备好了。"}</h2>
              <p>
                {project
                  ? "简报、脚本与分镜已经准备好。接下来，把计划变成镜头。"
                  : c.space === "personal"
                    ? "导入本地视频，整理资料，再带着一个问题观看。"
                    : "把参考留在这里，把观察写下来，再用自己的方式表达。当前可以先体验完整示例流程。"}
              </p>
              <div className="hero-actions">
                {project ? (
                  <Button
                    tone="primary"
                    icon={ArrowRight}
                    onClick={() => c.navigate(`/creator/${project.id}`)}
                  >
                    继续编辑
                  </Button>
                ) : c.space === "personal" ? (
                  <Button
                    tone="primary"
                    onClick={() => c.nativeAction("import")}
                  >
                    导入本地视频
                  </Button>
                ) : (
                  <DemoEntry />
                )}
                {project ? (
                  <Badge tone="purple">{project.stage} · 示例</Badge>
                ) : (
                  <span className="subtle">原视频保留 · 资料留在本机</span>
                )}
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="floating-note">
                <span>CREATIVE BRIEF</span>
                <div />
                <div />
                <div className="note-short" />
                <span className="note-check">✓ 一个问题　✓ 一个行动</span>
              </div>
              <div className="floating-play">
                <Play size={25} fill="currentColor" />
              </div>
              <div className="hero-spark">✦</div>
              <div className="hero-dot" />
            </div>
          </Card>
          <SectionTitle
            title="最近参考素材"
            note="把每一次观看，变成一次有目的的学习。"
          >
            <Button
              tone="ghost"
              icon={ArrowRight}
              onClick={() => c.navigate("/library")}
            >
              全部素材
            </Button>
          </SectionTitle>
          {w.assets.length ? (
            <div className="asset-grid dashboard-assets">
              {w.assets
                .filter((a) => !a.archived)
                .slice(0, 3)
                .map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    noteCount={
                      w.notes.filter((n) => n.assetId === asset.id).length
                    }
                    onOpen={() => c.navigate(`/analysis/${asset.id}`)}
                    onFavorite={() => c.toggleFavorite(asset)}
                  />
                ))}
            </div>
          ) : (
            <Card className="welcome-library">
              <div className="welcome-visual">
                <FolderOpen size={36} />
              </div>
              <div>
                <h3>第一条参考，值得认真留下。</h3>
                <p className="subtle">
                  还没有未归档的素材。选择本地视频，复制到资料库。
                </p>
                <Button
                  tone="ghost"
                  icon={ArrowRight}
                  onClick={() => c.navigate("/library")}
                >
                  查看素材库
                </Button>
              </div>
            </Card>
          )}
          <div className="overview-row">
            {[
              {
                label: "参考素材",
                value: w.assets.filter((a) => !a.archived).length,
                icon: FolderOpen,
              },
              {
                label: "创作中项目",
                value: w.projects.filter(
                  (p) => !["已归档", "待复盘"].includes(p.stage),
                ).length,
                icon: Clapperboard,
              },
              {
                label: "已记录方法",
                value: w.methods.filter((m) => !m.archived).length,
                icon: BookOpen,
              },
            ].map((item) => (
              <Card key={item.label} className="overview-item">
                <div className="stat-icon">
                  <item.icon size={19} />
                </div>
                <div>
                  <strong>
                    {c.space === "personal" && item.label !== "参考素材"
                      ? "—"
                      : item.value}
                    <span>{c.space === "demo" ? "示例" : "本地"}</span>
                  </strong>
                  <p>{item.label}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
        <aside className="dashboard-aside">
          <Card className="next-step">
            <div className="mini-icon">
              <Lightbulb size={19} />
            </div>
            <h3>今天，推进一小步</h3>
            <p className="subtle">
              {project ? "下一项示例拍摄任务" : "可以先走一遍示例流程"}
            </p>
            <strong>{pending[0]?.text ?? "观察 → 记录 → 原创表达"}</strong>
            <Button
              tone="ghost"
              icon={ArrowRight}
              onClick={() =>
                project
                  ? c.navigate(`/creator/${project.id}`)
                  : c.changeSpace("demo")
              }
            >
              {project ? "打开创作项目" : "开始体验"}
            </Button>
          </Card>
          <Card className="todo-card">
            <SectionTitle title="我的待办">
              <Badge>{pending.length}</Badge>
            </SectionTitle>
            {pending.length ? (
              pending.slice(0, 4).map((task) => (
                <button
                  className="todo-item"
                  key={task.id}
                  onClick={() => c.navigate(`/creator/${task.project.id}`)}
                >
                  <span className="todo-check" />
                  <span>
                    <strong>{task.text}</strong>
                    <small>{task.project.title}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="quiet-empty">
                <Check size={22} />
                <p>这里会显示项目中的未完成事项。</p>
              </div>
            )}
          </Card>
          <div className="workflow-note">
            <span className="eyebrow">MAKE IT YOUR OWN</span>
            <h3>学习方法，保留自己的声音。</h3>
            <p>参考是起点。用自己的主题、镜头和表达，完成原创作品。</p>
            <div className="workflow-steps">
              <span>参考</span>
              <ArrowRight size={13} />
              <span>学习</span>
              <ArrowRight size={13} />
              <span>创作</span>
            </div>
          </div>
        </aside>
      </div>
      <div className="quick-links">
        <Button
          tone="ghost"
          icon={Link}
          onClick={() =>
            c.unavailable(
              "参考链接保存尚未开放",
              "本轮支持本地视频管理，参考链接仍未接入个人保存。",
            )
          }
        >
          保存参考链接
        </Button>
        <Button
          tone="ghost"
          icon={Sparkles}
          onClick={() =>
            c.changeSpace(c.space === "demo" ? "personal" : "demo")
          }
        >
          {c.space === "demo" ? "返回个人空间" : "探索示例空间"}
        </Button>
      </div>
    </>
  );
}
