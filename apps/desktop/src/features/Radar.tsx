import { useState } from "react";
import { Check, Compass, Radio, Sparkles } from "lucide-react";
import { useWorkbench, requestUnavailable } from "../app/context";
import { Badge, Button, Card, Field, PageTitle } from "../components/ui";

const interests = [
  "知识分享",
  "生活记录",
  "手工制作",
  "产品表达",
  "摄影",
  "旅行",
  "美食",
  "学习成长",
];
export function Radar() {
  const c = useWorkbench();
  const [personalPreview, setPersonalPreview] = useState<string[]>([]);
  const [excluded, setExcluded] = useState("");
  const selected = c.space === "demo" ? c.workspace.interests : personalPreview;
  return (
    <>
      <PageTitle
        eyebrow="FIND WHAT IS WORTH LEARNING"
        title="爆款雷达"
        description="未来从可用的数据源中，发现值得学习的视频。"
      >
        <Badge tone="amber">规划中</Badge>
      </PageTitle>
      <Card className="radar-hero">
        <div className="radar-illustration" aria-hidden="true">
          <div className="radar-ring outer" />
          <div className="radar-ring middle" />
          <div className="radar-ring inner" />
          <div className="radar-center">
            <Radio size={30} />
          </div>
          <span className="radar-point one" />
          <span className="radar-point two" />
          <span className="radar-point three" />
        </div>
        <div>
          <Badge tone="purple">下一次好灵感，值得等待</Badge>
          <h2>发现的起点，是你想学什么。</h2>
          <p>
            这个版本没有榜单数据源，也不会抓取平台或追踪账号。你可以先试选兴趣方向，作为未来发现功能的界面预览。
          </p>
          <Button
            icon={Compass}
            onClick={() => void requestUnavailable("radar", c.unavailable)}
          >
            查看雷达能力状态
          </Button>
        </div>
      </Card>
      <div className="radar-grid">
        <Card className="preferences-card">
          <h2>我想关注的领域</h2>
          <p className="subtle">兴趣选择是偏好，不代表已关注任何账号或榜单。</p>
          <div className="interest-chips">
            {interests.map((interest) => (
              <button
                key={interest}
                aria-pressed={selected.includes(interest)}
                className={selected.includes(interest) ? "selected" : ""}
                onClick={() => {
                  const next = selected.includes(interest)
                    ? selected.filter((i) => i !== interest)
                    : [...selected, interest];
                  if (c.space === "demo")
                    c.mutate((w) => ({ ...w, interests: next }));
                  else setPersonalPreview(next);
                }}
              >
                {selected.includes(interest) && <Check size={14} />} {interest}
              </button>
            ))}
          </div>
          <Field label="想排除的主题">
            <textarea
              rows={3}
              placeholder="例如：纯搬运、与当前创作方向无关的内容"
              value={c.space === "demo" ? c.workspace.excludedTopics : excluded}
              onChange={(e) =>
                c.space === "demo"
                  ? c.mutate((w) => ({ ...w, excludedTopics: e.target.value }))
                  : setExcluded(e.target.value)
              }
            />
          </Field>
          <p className="inline-note">
            D2 偏好预览仅在当前会话有效。真实保存将在 D6 接入。
          </p>
        </Card>
        <Card className="radar-principles">
          <div className="mini-icon">
            <Sparkles size={21} />
          </div>
          <h2>发现之后，更值得问的事</h2>
          <div>
            <span>01</span>
            <p>它的开头，为什么让我停下来？</p>
          </div>
          <div>
            <span>02</span>
            <p>什么结构或镜头方法可以借鉴？</p>
          </div>
          <div>
            <span>03</span>
            <p>怎样用自己的主题，做出不同表达？</p>
          </div>
          <p className="subtle">发现功能接入后，仍然以学习与原创创作为目标。</p>
        </Card>
      </div>
    </>
  );
}
