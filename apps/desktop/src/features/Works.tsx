import { useState } from "react";
import { ArrowRight, Clapperboard, Edit3, Film, Upload } from "lucide-react";
import { useWorkbench } from "../app/context";
import { DemoEntry, NewProjectButton } from "../app/Shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageTitle,
  Tabs,
} from "../components/ui";
import { stages, type CreativeProject } from "../domain";
import { updateProject } from "../services";

export function Works() {
  const c = useWorkbench();
  const [filter, setFilter] = useState("all");
  const [reviewId, setReviewId] = useState<string>();
  const projects = c.workspace.projects.filter(
    (p) =>
      filter === "all" ||
      (filter === "active" && !["待复盘", "已归档"].includes(p.stage)) ||
      (filter === "review" && p.stage === "待复盘") ||
      (filter === "archive" && p.stage === "已归档"),
  );
  const review = c.workspace.projects.find((p) => p.id === reviewId);
  return (
    <>
      <PageTitle
        eyebrow="YOUR WORK, YOUR PROGRESS"
        title="我的作品"
        description="每一次创作都有价值。记录阶段，也记录下一次的进步方向。"
      >
        <NewProjectButton />
      </PageTitle>
      <Tabs
        label="作品阶段筛选"
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "全部项目" },
          { id: "active", label: "创作中" },
          { id: "review", label: "待复盘" },
          { id: "archive", label: "已归档" },
        ]}
      />
      {projects.length ? (
        <div className="works-grid">
          {projects.map((p) => (
            <Card className="work-card" key={p.id}>
              <div className="work-cover">
                <Clapperboard size={35} />
                <span>ORIGINAL PROJECT</span>
                <Badge tone="amber">示例项目</Badge>
              </div>
              <div className="work-body">
                <div className="work-head">
                  <h2>{p.title}</h2>
                  <Badge tone="purple">{p.stage}</Badge>
                </div>
                <p className="subtle">
                  {p.script.length} 段脚本 · {p.storyboard.length} 个分镜 ·{" "}
                  {p.checklist.filter((t) => !t.done).length} 项待办
                </p>
                <label className="field">
                  <span>项目阶段</span>
                  <select
                    aria-label={`${p.title} 阶段`}
                    value={p.stage}
                    onChange={(e) =>
                      c.mutate((w) =>
                        updateProject(w, {
                          ...p,
                          stage: e.target.value as CreativeProject["stage"],
                        }),
                      )
                    }
                  >
                    {stages.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <div className="work-file-state">
                  <Film size={17} />
                  <span>尚未关联个人成片</span>
                  <button
                    onClick={() =>
                      c.unavailable(
                        "成片关联 · D5",
                        "D5 将把个人成片版本关联到已有创作项目，不另建一套作品项目。",
                      )
                    }
                  >
                    关联说明
                  </button>
                </div>
                <div className="work-actions">
                  <Button icon={Edit3} onClick={() => setReviewId(p.id)}>
                    手动复盘
                  </Button>
                  <Button
                    tone="primary"
                    icon={ArrowRight}
                    onClick={() => c.navigate(`/creator/${p.id}`)}
                  >
                    继续编辑
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Clapperboard}
          title={
            c.space === "personal"
              ? "你的第一支作品，从这里开始"
              : "这个阶段还没有示例项目"
          }
          description={
            c.space === "personal"
              ? "作品与创作项目共用同一份资料。示例展示项目阶段和人工复盘，不生成自动评分。"
              : "项目阶段由你选择，可以在其他阶段找到现有示例。"
          }
        >
          {c.space === "personal" ? (
            <DemoEntry />
          ) : (
            <Button onClick={() => setFilter("all")}>查看全部项目</Button>
          )}
        </EmptyState>
      )}
      <div className="page-note">
        没有自动评分，没有虚构播放量。复盘的价值来自你自己的观察。
      </div>
      {review && (
        <Modal
          title={`手动复盘 · ${review.title}`}
          drawer
          onClose={() => setReviewId(undefined)}
        >
          <div className="form-stack">
            {(
              [
                { key: "goal", label: "这次目标" },
                { key: "strengths", label: "做得好的地方" },
                { key: "problems", label: "问题时间点 / 具体问题" },
                { key: "changes", label: "下一版修改" },
                { key: "practice", label: "下次练习" },
              ] as const
            ).map((field) => (
              <Field label={field.label} key={field.key}>
                <textarea
                  rows={3}
                  value={review.review[field.key]}
                  onChange={(e) =>
                    c.mutate((w) =>
                      updateProject(w, {
                        ...review,
                        review: {
                          ...review.review,
                          [field.key]: e.target.value,
                        },
                      }),
                    )
                  }
                />
              </Field>
            ))}
            <p className="subtle">复盘即时更新演示会话，退出后恢复初始示例。</p>
            <Button tone="primary" onClick={() => setReviewId(undefined)}>
              完成本次示例复盘
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
