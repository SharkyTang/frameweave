import { useState } from "react";
import {
  Archive,
  ArrowRight,
  Grid2X2,
  Link,
  List,
  Search,
  Star,
  Upload,
} from "lucide-react";
import { useWorkbench } from "../app/context";
import { DemoEntry } from "../app/Shell";
import {
  AssetCard,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Modal,
  PageTitle,
  Tabs,
} from "../components/ui";
import { filterAssets } from "../domain";

export function Library() {
  const c = useWorkbench();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [layout, setLayout] = useState("grid");
  const [selected, setSelected] = useState<string>();
  const [archived, setArchived] = useState(false);
  const assets = filterAssets(c.workspace.assets, query, filter, archived);
  const asset = c.workspace.assets.find((a) => a.id === selected);
  return (
    <>
      <PageTitle
        eyebrow="INSPIRATION LIBRARY"
        title="灵感素材库"
        description="收藏值得观察的表达，整理属于你的参考。"
      >
        <Button
          icon={Link}
          onClick={() =>
            c.unavailable(
              "参考链接保存 · D3",
              "当前阶段提供页面和示例。D3 将允许手动填写标题、备注与链接，不请求远程内容。",
            )
          }
        >
          保存参考链接
        </Button>
        <Button
          tone="primary"
          icon={Upload}
          onClick={() => c.nativeAction("import")}
        >
          导入本地视频
        </Button>
      </PageTitle>
      <div className="library-toolbar">
        <Tabs
          label="素材筛选"
          value={filter}
          onChange={setFilter}
          items={[
            { id: "all", label: "全部素材" },
            { id: "favorite", label: "我的收藏" },
            { id: "local", label: "可播放" },
            { id: "link", label: "参考链接" },
          ]}
        />
        <div className="toolbar-right">
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label="搜索素材"
              placeholder="搜索标题、标签、备注…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="layout-switch">
            <IconButton
              icon={Grid2X2}
              label="网格视图"
              aria-pressed={layout === "grid"}
              onClick={() => setLayout("grid")}
            />
            <IconButton
              icon={List}
              label="列表视图"
              aria-pressed={layout === "list"}
              onClick={() => setLayout("list")}
            />
          </div>
        </div>
      </div>
      <div className="result-row">
        <span>
          {archived ? "已归档" : "最近导入"}{" "}
          <span className="subtle">
            · {assets.length} 条{c.space === "demo" ? "示例素材" : "本地素材"}
          </span>
        </span>
        <Button
          tone="ghost"
          icon={Archive}
          onClick={() => setArchived(!archived)}
        >
          {archived ? "回到素材库" : "查看归档"}
        </Button>
      </div>
      {assets.length ? (
        <div
          className={
            layout === "grid" ? "asset-grid library-grid" : "asset-list"
          }
        >
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              noteCount={
                c.workspace.notes.filter((n) => n.assetId === a.id).length
              }
              list={layout === "list"}
              onOpen={() => setSelected(a.id)}
              onFavorite={() =>
                c.mutate((w) => ({
                  ...w,
                  assets: w.assets.map((item) =>
                    item.id === a.id
                      ? { ...item, favorite: !item.favorite }
                      : item,
                  ),
                }))
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            c.space === "personal"
              ? "这里将是你的灵感资料库"
              : "没有找到匹配的素材"
          }
          description={
            c.space === "personal"
              ? "下一阶段支持本地视频导入。现在可以进入演示空间，体验搜索、收藏和素材学习。"
              : "试试其他关键词或筛选条件。归档不会删除任何外部文件。"
          }
        >
          {c.space === "personal" ? (
            <DemoEntry />
          ) : (
            <Button
              onClick={() => {
                setQuery("");
                setFilter("all");
                setArchived(false);
              }}
            >
              清除筛选
            </Button>
          )}
        </EmptyState>
      )}
      <div className="page-note">
        {c.space === "demo"
          ? "示例搜索、收藏和归档只影响本次演示会话。"
          : "素材文件与元数据的真实导入、管理将在 D3 接入。"}{" "}
        下载插件尚未接入。
      </div>
      {asset && (
        <Modal
          title="参考素材详情"
          drawer
          onClose={() => setSelected(undefined)}
        >
          <div className="detail-head">
            <Badge tone="amber">演示素材</Badge>
            <h3>{asset.title}</h3>
            <p className="subtle">{asset.description}</p>
          </div>
          <div className="form-stack">
            <Field label="标题">
              <input
                value={asset.title}
                onChange={(e) =>
                  c.mutate((w) => ({
                    ...w,
                    assets: w.assets.map((a) =>
                      a.id === asset.id ? { ...a, title: e.target.value } : a,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="标签" hint="以中文或英文逗号分隔">
              <input
                value={asset.tags.join("，")}
                onChange={(e) =>
                  c.mutate((w) => ({
                    ...w,
                    assets: w.assets.map((a) =>
                      a.id === asset.id
                        ? {
                            ...a,
                            tags: e.target.value
                              .split(/[,，]/)
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }
                        : a,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="学习目标">
              <textarea
                rows={3}
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
            <div className="detail-info">
              <span>视频状态</span>
              <strong>
                {
                  {
                    available: "应用内自制短片",
                    link_only: "未关联本地视频",
                    missing: "演示：文件缺失",
                    unsupported: "无法播放",
                  }[asset.status]
                }
              </strong>
              <span>字幕状态</span>
              <strong>未导入 · 不生成假字幕</strong>
              <span>学习笔记</span>
              <strong>
                {c.workspace.notes.filter((n) => n.assetId === asset.id).length}{" "}
                条
              </strong>
            </div>
            <div className="stack-actions">
              <Button
                tone="primary"
                icon={ArrowRight}
                onClick={() => {
                  setSelected(undefined);
                  c.navigate(`/analysis/${asset.id}`);
                }}
              >
                进入学习空间
              </Button>
              <Button
                icon={Archive}
                onClick={() => {
                  c.mutate((w) => ({
                    ...w,
                    assets: w.assets.map((a) =>
                      a.id === asset.id ? { ...a, archived: !a.archived } : a,
                    ),
                  }));
                  setSelected(undefined);
                }}
              >
                {asset.archived ? "恢复素材" : "归档素材"}
              </Button>
            </div>
            <p className="subtle">编辑立即更新演示会话，退出后恢复初始示例。</p>
          </div>
        </Modal>
      )}
    </>
  );
}
