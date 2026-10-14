import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  blankProject,
  emptyWorkspace,
  parseRoute,
  type ShellInfo,
  type Space,
  type Workspace,
} from "../domain";
import { SessionWorkspaceAdapter } from "../adapters/demo";
import { shell } from "../adapters/desktop";
import { capabilities } from "../adapters/disconnected";

export type Dialog =
  | { type: "unavailable"; title: string; text: string }
  | { type: "newProject"; referenceId?: string }
  | { type: "search" }
  | { type: "quit" }
  | { type: "reset" }
  | null;
interface WorkbenchContext {
  space: Space;
  workspace: Workspace;
  route: ReturnType<typeof parseRoute>;
  info?: ShellInfo;
  loading: boolean;
  error?: string;
  dirty: boolean;
  dialog: Dialog;
  setDialog: (d: Dialog) => void;
  toast: string;
  notify: (text: string) => void;
  navigate: (path: string) => void;
  changeSpace: (space: Space) => void;
  resetDemo: () => Promise<void>;
  mutate: (change: (w: Workspace) => Workspace) => void;
  createProject: (title: string, referenceId?: string) => void;
  unavailable: (title: string, text: string) => void;
  newProject: (referenceId?: string) => void;
  nativeAction: (action: string) => void;
  reload: () => Promise<void>;
}
const Context = createContext<WorkbenchContext | null>(null);
const adapter = new SessionWorkspaceAdapter();
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [space, setSpace] = useState<Space>("personal");
  const [personal] = useState(emptyWorkspace);
  const [demo, setDemo] = useState(emptyWorkspace);
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const [info, setInfo] = useState<ShellInfo>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const unavailable = (title: string, text: string) =>
    setDialog({ type: "unavailable", title, text });
  const notify = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  };
  const navigate = (path: string) => {
    const r = parseRoute(path);
    location.hash = r.path;
    setRoute(r);
  };
  const reload = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [nativeInfo, initialDemo] = await Promise.all([
        shell.info(),
        adapter.load("demo"),
      ]);
      setInfo(nativeInfo);
      setDemo(initialDemo);
      if (!location.hash) navigate(nativeInfo.route);
    } catch {
      setError("桌面信息读取失败。请重试；示例资料没有写入个人空间。");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
    return () => clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => {
    const handle = () => setRoute(parseRoute(location.hash));
    addEventListener("hashchange", handle);
    return () => removeEventListener("hashchange", handle);
  }, []);
  useEffect(() => {
    if (info)
      void shell
        .rememberRoute(route.path)
        .catch(() => notify("最后页面保存失败，下次启动可能返回首页。"));
  }, [route.path, info]);
  const newProject = (referenceId?: string) =>
    space === "demo"
      ? setDialog({ type: "newProject", referenceId })
      : unavailable(
          "个人创作项目将在 D5 开放",
          "当前 D2 提供完整编辑器与示例流程。进入演示空间后，可以新建、编辑示例项目；退出应用时这些编辑不会保留。",
        );
  const nativeAction = (action: string) => {
    if (action === "new") newProject();
    else if (action === "import")
      unavailable(
        "本地素材导入 · 下一阶段 D3",
        "D3 将加入原生文件选择、复制到资料库和 SQLite。当前不读取或复制你的文件，可先查看工作台自制示例短片。",
      );
    else if (action === "save")
      unavailable(
        "D2 编辑保留在当前会话",
        "示例变更已保留在当前应用会话中。磁盘持久化尚未接入，退出后会恢复初始示例。",
      );
    else if (action === "settings") navigate("/settings");
    else if (action === "search") setDialog({ type: "search" });
    else if (action === "quit") {
      if (dirty) setDialog({ type: "quit" });
      else void shell.quit();
    } else if (action === "shell-error")
      notify("窗口设置保存失败，请检查应用资料目录权限。");
  };
  const currentAction = useRef(nativeAction);
  currentAction.current = nativeAction;
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void shell
      .onAction((action) => currentAction.current(action))
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => notify("系统菜单监听失败，仍可使用界面按钮。"));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.isComposing ||
        (!event.metaKey && !event.ctrlKey) ||
        info?.native
      )
        return;
      const action = (
        {
          n: "new",
          o: "import",
          s: "save",
          k: "search",
          ",": "settings",
        } as Record<string, string>
      )[event.key.toLowerCase()];
      if (action) {
        event.preventDefault();
        currentAction.current(action);
      }
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [info]);
  const mutate = (change: (w: Workspace) => Workspace) => {
    if (space !== "demo") {
      unavailable(
        "个人数据尚未接入",
        "D3 开始接入真实个人资料。示例操作只在演示空间可用。",
      );
      return;
    }
    setDemo(change);
    setDirty(true);
  };
  const createProject = (title: string, referenceId?: string) => {
    const id = `demo-${crypto.randomUUID()}`;
    mutate((w) => ({
      ...w,
      projects: [
        blankProject(id, title.trim(), referenceId ? [referenceId] : []),
        ...w.projects,
      ],
    }));
    setDialog(null);
    navigate(`/creator/${id}`);
  };
  const resetDemo = async () => {
    setDemo(await adapter.load("demo"));
    setDirty(false);
    setDialog(null);
    navigate("/home");
    notify("演示已恢复，个人空间没有变化。");
  };
  const value: WorkbenchContext = {
    space,
    workspace: space === "demo" ? demo : personal,
    route,
    info,
    loading,
    error,
    dirty,
    dialog,
    setDialog,
    toast,
    notify,
    navigate,
    changeSpace: (next) => {
      setSpace(next);
      setDialog(null);
      navigate("/home");
    },
    resetDemo,
    mutate,
    createProject,
    unavailable,
    newProject,
    nativeAction,
    reload,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkbench() {
  const value = useContext(Context);
  if (!value) throw new Error("工作台上下文缺失");
  return value;
}
export async function requestUnavailable(
  key: keyof typeof capabilities,
  show: (title: string, text: string) => void,
) {
  const result = await capabilities[key].request();
  if (!result.ok) show("尚未接入", result.error.message);
}
