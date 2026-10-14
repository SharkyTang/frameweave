import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { WorkbenchProvider, useWorkbench } from "./app/context";
import { Shell } from "./app/Shell";
import { Dialogs } from "./app/Dialogs";
import { Button, Card } from "./components/ui";
import { shell } from "./adapters/desktop";
import { Dashboard } from "./features/Dashboard";
import { Library } from "./features/Library";
import { Analysis } from "./features/Analysis";
import { Creator } from "./features/Creator";
import { Methods } from "./features/Methods";
import { Works } from "./features/Works";
import { Radar } from "./features/Radar";
import { Settings } from "./features/Settings";
const pages = {
  home: Dashboard,
  library: Library,
  analysis: Analysis,
  creator: Creator,
  methods: Methods,
  works: Works,
  radar: Radar,
  settings: Settings,
};
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error("workbench: render failure");
  }
  render() {
    return this.state.error ? (
      <div className="fatal-error">
        <AlertCircle size={30} />
        <h1>工作台遇到了界面错误</h1>
        <p>示例数据没有写入个人资料。重新载入会恢复初始示例。</p>
        <Button tone="primary" onClick={() => location.reload()}>
          重新载入
        </Button>
        <Button onClick={() => void shell.quit()}>退出应用</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Content() {
  const c = useWorkbench();
  const Page = pages[c.route.page];
  return (
    <>
      <Shell>
        {c.loading ? (
          <div className="loading-state" role="status">
            <div className="loading-mark" />
            <h2>正在打开本地工作台</h2>
            <p>读取本机资料库与桌面信息…</p>
          </div>
        ) : c.error ? (
          <Card className="startup-error">
            <AlertCircle size={28} />
            <h2>暂时无法打开工作台</h2>
            <p role="alert">{c.error}</p>
            <Button onClick={() => void c.reload()}>重试</Button>
          </Card>
        ) : (
          <Page key={`${c.space}-${c.route.page}-${c.route.id ?? ""}`} />
        )}
      </Shell>
      <Dialogs />
      {c.toast && (
        <div className="toast" role="status">
          {c.toast}
        </div>
      )}
    </>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <WorkbenchProvider>
        <Content />
      </WorkbenchProvider>
    </ErrorBoundary>
  );
}
