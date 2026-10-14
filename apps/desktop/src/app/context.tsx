import {
  createContext,
  useCallback,
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
  nativeErrorMessage,
  assetPatch,
  type AssetPatch,
  type ImportBatch,
  type LibraryInfo,
  type ShellInfo,
  type Space,
  type VideoAsset,
  type Workspace,
} from "../domain";
import { SessionWorkspaceAdapter } from "../adapters/demo";
import { shell, personalMedia } from "../adapters/desktop";
import { capabilities } from "../adapters/disconnected";
export type Dialog =
  | { type: "unavailable"; title: string; text: string }
  | { type: "newProject"; referenceId?: string }
  | { type: "search" }
  | { type: "quit" }
  | { type: "reset" }
  | { type: "import" }
  | { type: "leave"; proceed: () => void }
  | null;
interface WorkbenchContext {
  space: Space;
  workspace: Workspace;
  route: ReturnType<typeof parseRoute>;
  info?: ShellInfo;
  libraryInfo?: LibraryInfo;
  loading: boolean;
  error?: string;
  dirty: boolean;
  draftDirty: boolean;
  saving: boolean;
  dialog: Dialog;
  setDialog: (d: Dialog) => void;
  toast: string;
  notify: (s: string) => void;
  navigate: (s: string) => void;
  guard: (f: () => void) => void;
  changeSpace: (s: Space) => void;
  resetDemo: () => Promise<void>;
  mutate: (f: (w: Workspace) => Workspace) => void;
  createProject: (s: string, id?: string) => void;
  unavailable: (title: string, text: string) => void;
  newProject: (id?: string) => void;
  nativeAction: (s: string) => void;
  reload: () => Promise<void>;
  refreshPersonal: () => Promise<void>;
  saveAsset: (patch: AssetPatch) => Promise<VideoAsset>;
  toggleFavorite: (asset: VideoAsset) => void;
  setEditing: (dirty: boolean, saving: boolean, onSave?: () => void) => void;
  batch: ImportBatch | null;
  setBatch: (b: ImportBatch | null) => void;
  composing: React.MutableRefObject<boolean>;
}
const Context = createContext<WorkbenchContext | null>(null);
const demoAdapter = new SessionWorkspaceAdapter();
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [space, setSpace] = useState<Space>("personal");
  const [personal, setPersonal] = useState(emptyWorkspace);
  const [demo, setDemo] = useState(emptyWorkspace);
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const [info, setInfo] = useState<ShellInfo>();
  const [libraryInfo, setLibraryInfo] = useState<LibraryInfo>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [demoDirty, setDemoDirty] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveHandler = useRef<() => void>(undefined);
  const composing = useRef(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState("");
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const generation = useRef(0);
  const notify = useCallback((message: string) => {
    clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  const unavailable = (title: string, text: string) =>
    setDialog({ type: "unavailable", title, text });
  const setEditing = useCallback(
    (dirty: boolean, busy: boolean, onSave?: () => void) => {
      setDraftDirty(dirty);
      setSaving(busy);
      saveHandler.current = onSave;
    },
    [],
  );
  const guard = (proceed: () => void) => {
    if (saving) {
      notify("正在保存资料，请稍候。");
      return;
    }
    if (draftDirty) setDialog({ type: "leave", proceed });
    else proceed();
  };
  const directNavigate = (path: string) => {
    const next = parseRoute(path);
    location.hash = next.path;
    setRoute(next);
  };
  const navigate = (path: string) => guard(() => directNavigate(path));
  const refreshPersonal = useCallback(async () => {
    const current = ++generation.current;
    const w = await personalMedia.load("personal");
    if (current !== generation.current) return;
    setPersonal((old) => ({
      ...w,
      assets: w.assets.map((a) => {
        const previous = old.assets.find((p) => p.id === a.id);
        return previous && (previous.revision ?? 0) > (a.revision ?? 0)
          ? previous
          : a;
      }),
    }));
  }, []);
  const reload = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [nativeInfo, initialDemo] = await Promise.all([
        shell.info(),
        demoAdapter.load("demo"),
      ]);
      setInfo(nativeInfo);
      setDemo(initialDemo);
      await refreshPersonal();
      setLibraryInfo(await personalMedia.info());
      setBatch(nativeInfo.native ? await personalMedia.batch() : null);
      if (!location.hash) directNavigate(nativeInfo.route);
    } catch (e) {
      setError(nativeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
    return () => {
      ++generation.current;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const handler = () => setRoute(parseRoute(location.hash));
    addEventListener("hashchange", handler);
    return () => removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (info)
      void shell
        .rememberRoute(route.path)
        .catch(() => notify("最后页面保存失败，下次启动可能返回首页。"));
  }, [route.path, info, notify]);
  useEffect(() => {
    if (!batch?.active) return;
    let disposed = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const latest = await personalMedia.batch(batch.id);
        if (!disposed) {
          setBatch(latest);
          if (!latest?.active) await refreshPersonal();
        }
      } catch (e) {
        if (!disposed) notify(nativeErrorMessage(e));
      } finally {
        inFlight = false;
      }
    };
    const interval = setInterval(() => void poll(), 500);
    void poll();
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [batch?.id, batch?.active, refreshPersonal, notify]);
  const saveAsset = async (input: AssetPatch) => {
    if (space !== "personal") throw new Error("演示空间不能写入个人资料。");
    const saved = await personalMedia.updateAsset(input);
    setPersonal((w) => ({
      ...w,
      assets: w.assets.map((a) => (a.id === saved.id ? saved : a)),
    }));
    return saved;
  };
  const toggleFavorite = (asset: VideoAsset) => {
    if (space === "demo") {
      setDemo((w) => ({
        ...w,
        assets: w.assets.map((a) =>
          a.id === asset.id ? { ...a, favorite: !a.favorite } : a,
        ),
      }));
      setDemoDirty(true);
    } else
      void saveAsset({ ...assetPatch(asset), favorite: !asset.favorite })
        .then(() => notify(asset.favorite ? "已取消收藏" : "已收藏到本机"))
        .catch((e) => notify(nativeErrorMessage(e)));
  };
  const newProject = (referenceId?: string) =>
    space === "demo"
      ? setDialog({ type: "newProject", referenceId })
      : unavailable(
          "个人创作项目将在 D5 开放",
          "进入演示空间后可新建、编辑示例项目；个人脚本与分镜尚未接入保存。",
        );
  const nativeAction = (action: string) => {
    if (action === "new") newProject();
    else if (action === "import")
      guard(() =>
        space === "personal"
          ? setDialog({ type: "import" })
          : unavailable(
              "导入到个人资料库",
              "请返回个人空间导入本地视频。演示空间保持独立，不能写入个人资料。",
            ),
      );
    else if (action === "save") {
      if (composing.current) return;
      if (saveHandler.current) saveHandler.current();
      else
        unavailable(
          space === "demo" ? "演示编辑保留在当前会话" : "没有待保存的素材资料",
          space === "demo"
            ? "示例变更仅保留到退出，未写入个人资料。"
            : "素材详情中点击保存；创作项目与脚本持久化将在 D5 开放。",
        );
    } else if (action === "settings") navigate("/settings");
    else if (action === "search") setDialog({ type: "search" });
    else if (action === "quit") {
      if (demoDirty || draftDirty || saving || batch?.active)
        setDialog({ type: "quit" });
      else void shell.quit().catch((e) => notify(nativeErrorMessage(e)));
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
  }, [notify]);
  useEffect(() => {
    const start = () => {
      composing.current = true;
    };
    const end = () => {
      composing.current = false;
    };
    addEventListener("compositionstart", start);
    addEventListener("compositionend", end);
    const handler = (e: KeyboardEvent) => {
      if (
        e.isComposing ||
        composing.current ||
        (!e.metaKey && !e.ctrlKey) ||
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
      )[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        currentAction.current(action);
      }
    };
    addEventListener("keydown", handler);
    return () => {
      removeEventListener("keydown", handler);
      removeEventListener("compositionstart", start);
      removeEventListener("compositionend", end);
    };
  }, [info]);
  const mutate = (change: (w: Workspace) => Workspace) => {
    if (space !== "demo") {
      unavailable(
        "此功能尚未接入个人保存",
        "个人素材资料通过详情表单保存；时间笔记将在 D4、创作与方法将在 D5 开放。",
      );
      return;
    }
    setDemo(change);
    setDemoDirty(true);
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
    setDemo(await demoAdapter.load("demo"));
    setDemoDirty(false);
    setDialog(null);
    navigate("/home");
    notify("演示已恢复，个人空间没有变化。");
  };
  const value: WorkbenchContext = {
    space,
    workspace: space === "demo" ? demo : personal,
    route,
    info,
    libraryInfo,
    loading,
    error,
    dirty: demoDirty || draftDirty,
    draftDirty,
    saving,
    dialog,
    setDialog,
    toast,
    notify,
    navigate,
    guard,
    changeSpace: (next) =>
      guard(() => {
        setSpace(next);
        setDialog(null);
        directNavigate("/home");
      }),
    resetDemo,
    mutate,
    createProject,
    unavailable,
    newProject,
    nativeAction,
    reload,
    refreshPersonal,
    saveAsset,
    toggleFavorite,
    setEditing,
    batch,
    setBatch,
    composing,
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
