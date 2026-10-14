import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Compass,
  FileVideo,
  FolderHeart,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
  Clapperboard,
} from "lucide-react";
import type { Page } from "../domain";
import { useWorkbench } from "./context";
import { Badge, Button, IconButton } from "../components/ui";
const nav = [
  { page: "home", label: "工作台", icon: Home, group: "工作区" },
  { page: "library", label: "灵感素材库", icon: FolderHeart, group: "学习" },
  { page: "analysis", label: "视频拆解", icon: FileVideo },
  { page: "methods", label: "创作方法库", icon: BookOpen },
  { page: "creator", label: "创作导师", icon: Clapperboard, group: "创作" },
  { page: "works", label: "我的作品", icon: Compass },
  {
    page: "radar",
    label: "爆款雷达",
    icon: Radio,
    group: "发现",
    planned: true,
  },
  { page: "settings", label: "设置", icon: Settings, group: "系统" },
] as const;
export const pageNames: Record<Page, string> = {
  home: "工作台",
  library: "灵感素材库",
  analysis: "视频拆解",
  creator: "创作导师",
  methods: "创作方法库",
  works: "我的作品",
  radar: "爆款雷达",
  settings: "设置",
};
export function Shell({ children }: { children: React.ReactNode }) {
  const c = useWorkbench();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">
          <div className="brand-icon">
            <Clapperboard size={23} />
          </div>
          <div className="brand-name">
            <strong>逆向轻抖</strong>
            <span>视频创作者工作台</span>
          </div>
        </div>
        <button
          className="space-switch"
          onClick={() =>
            c.changeSpace(c.space === "demo" ? "personal" : "demo")
          }
          title="切换个人空间 / 演示空间"
        >
          <span className="space-avatar">
            {c.space === "demo" ? "示" : "我"}
          </span>
          <span>
            <strong>{c.space === "demo" ? "演示空间" : "我的工作空间"}</strong>
            <small>{c.space === "demo" ? "仅本次会话" : "本地 · 个人"}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav>
          {nav.map((item) => (
            <div key={item.page}>
              {"group" in item && <p className="nav-group">{item.group}</p>}
              <button
                className={`nav-item ${c.route.page === item.page ? "active" : ""}`}
                title={item.label}
                aria-current={c.route.page === item.page ? "page" : undefined}
                onClick={() => c.navigate(`/${item.page}`)}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {"planned" in item && <small>规划中</small>}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-note">
            <span className="connection-dot" />
            <span>AI / 下载插件尚未接入</span>
          </div>
          <div className="sidebar-foot">
            <span>桌面预览 · D2</span>
            <IconButton
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              label={collapsed ? "展开侧导航" : "收起侧导航"}
              onClick={() => setCollapsed(!collapsed)}
            />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>我的创作空间</span>
            <span>/</span>
            <strong>{pageNames[c.route.page]}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="command-trigger"
              onClick={() => c.setDialog({ type: "search" })}
            >
              <Search size={15} />
              <span>搜索与命令</span>
              <kbd>⌘ K</kbd>
            </button>
            <Badge tone={c.space === "demo" ? "amber" : "green"}>
              {c.space === "demo" ? "演示" : "个人空间"}
            </Badge>
            <div className="user-avatar">
              {c.space === "demo" ? "示" : "我"}
            </div>
          </div>
        </header>
        {c.space === "demo" && (
          <div className="demo-banner" role="status">
            <span>
              <Sparkles size={15} />
              <strong>演示空间</strong>{" "}
              自制示例与手动编辑，仅保留至退出，不写入个人资料。
            </span>
            <button onClick={() => c.changeSpace("personal")}>
              回到个人空间 <ArrowUpRight size={14} />
            </button>
          </div>
        )}
        <main className="page-content" id="main-content">
          {children}
        </main>
        <footer className="statusbar">
          <span>
            <span className="connection-dot" />
            {c.info?.native ? "本机桌面窗口" : "组件预览"} ·{" "}
            {c.space === "demo"
              ? "演示数据 / 会话内编辑"
              : "个人数据将在 D3 接入"}
          </span>
          <span>
            V{c.info?.version ?? "0.1.0"}{" "}
            <span className="statusbar-separator">|</span>{" "}
            {c.space === "demo" && c.dirty ? "示例有变更 · 未落盘" : "D0 → D2"}
          </span>
        </footer>
      </div>
    </div>
  );
}
export function DemoEntry() {
  const c = useWorkbench();
  return (
    <Button icon={Sparkles} onClick={() => c.changeSpace("demo")}>
      查看示例空间
    </Button>
  );
}
export function NewProjectButton() {
  const c = useWorkbench();
  return (
    <Button tone="primary" icon={Plus} onClick={() => c.newProject()}>
      新建创作项目
    </Button>
  );
}
