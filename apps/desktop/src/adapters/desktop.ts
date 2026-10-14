import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ShellPort, PersonalMediaPort } from "../ports";
import { emptyWorkspace, type AppError, type VideoAsset } from "../domain";
export const shell: ShellPort = {
  async info() {
    if (!isTauri())
      return {
        version: "0.1.0",
        platform: "browser",
        architecture: "preview",
        appData: "浏览器组件预览无原生目录",
        route: "/home",
        native: false,
      };
    return invoke("shell_info");
  },
  async rememberRoute(route) {
    if (isTauri()) await invoke("remember_route", { route });
  },
  async onAction(handler) {
    if (!isTauri()) return () => {};
    const unlistenAction = await listen<string>("desktop-action", (event) =>
      handler(event.payload),
    );
    const unlistenError = await listen<string>("shell-error", () =>
      handler("shell-error"),
    );
    return () => {
      unlistenAction();
      unlistenError();
    };
  },
  async quit() {
    if (isTauri()) await invoke("quit_application");
  },
};

export class NativeError extends Error {
  code: string;
  retryable: boolean;
  constructor(error: AppError) {
    super(error.message);
    this.code = error.code;
    this.retryable = error.retryable ?? true;
  }
}
async function business<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri())
    throw new NativeError({
      code: "NOT_IMPLEMENTED",
      message:
        "原生导入仅在 FrameWeave.app 中可用；浏览器组件预览不会读取本机文件。",
    });
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const e = error as Partial<AppError>;
    throw new NativeError({
      code: typeof e?.code === "string" ? e.code : "IO_FAILED",
      message:
        typeof e?.message === "string" ? e.message : "本机操作失败；请重试。",
      retryable: e?.retryable,
    });
  }
}
export const personalMedia: PersonalMediaPort = {
  async load(space) {
    if (space !== "personal")
      throw new NativeError({
        code: "VALIDATION_FAILED",
        message: "个人资料源不能装配演示数据。",
      });
    if (!isTauri()) return emptyWorkspace();
    const assets: VideoAsset[] = [];
    for (let offset = 0; ; offset += 200) {
      const page = await business<VideoAsset[]>("list_assets", {
        offset,
        limit: 200,
      });
      assets.push(...page);
      if (page.length < 200) break;
    }
    return { ...emptyWorkspace(), assets };
  },
  async info() {
    if (!isTauri())
      return {
        ready: false,
        schemaVersion: 0,
        journalMode: "none",
        recoveryWarnings: 0,
        maxFiles: 20,
        maxFileBytes: 5 * 1024 ** 3,
      };
    const status =
      await business<import("../domain").LibraryInfo>("library_info");
    if (status.isolatedProbe) void runIsolatedProbe();
    return status;
  },
  getAsset: (id) => business("get_asset", { id }),
  updateAsset: (input) => business("update_asset", { input }),
  choose: () => business("choose_local_videos"),
  start: (token) => business("start_import", { token }),
  batch: (id) => business("import_batch", { id: id ?? null }),
  cancel: (id, attemptId) =>
    business("cancel_import", { id, attemptId: attemptId ?? null }),
  async playback(id) {
    const source = await business<{
      assetId: string;
      path: string;
      contentHash: string;
      playbackToken: string;
    }>("resolve_playback", { id });
    return {
      assetId: source.assetId,
      url: convertFileSrc(source.path),
      contentHash: source.contentHash,
      playbackToken: source.playbackToken,
    };
  },
  releasePlayback: (token) => business("release_playback", { token }),
  metadata: (input) => business("record_media_metadata", { input }),
  playbackFailed: (id, contentHash, token) =>
    business("record_playback_failure", { id, contentHash, token }),
};

// Test evidence only: Rust permits this solely with an explicit isolated-root opt-in.
async function runIsolatedProbe() {
  try {
    const targets = await business<
      { name: string; path: string; scopeAllowed: boolean }[]
    >("isolated_media_probe");
    const results = [];
    for (const t of targets) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      const result = await new Promise<{
        name: string;
        loaded: boolean;
        errorCode: number | null;
        durationMs: number | null;
        width: number | null;
        height: number | null;
      }>((resolve) => {
        const complete = (loaded: boolean) =>
          resolve({
            name: t.name,
            loaded,
            errorCode: v.error?.code ?? null,
            durationMs: Number.isFinite(v.duration) ? v.duration * 1000 : null,
            width: loaded ? v.videoWidth : null,
            height: loaded ? v.videoHeight : null,
          });
        const timeout = setTimeout(() => complete(false), 5000);
        v.onloadedmetadata = () => {
          clearTimeout(timeout);
          complete(true);
        };
        v.onerror = () => {
          clearTimeout(timeout);
          complete(false);
        };
        v.src = convertFileSrc(t.path);
      });
      v.pause();
      v.removeAttribute("src");
      v.load();
      results.push({ ...result, scopeAllowed: t.scopeAllowed });
    }
    // Scope assertions accompany actual WKWebView media-URL errors. No paths/content in recorded proof.
    const scopeProof = results.every(
      (r) => r.scopeAllowed === (r.name === "media"),
    );
    if (!scopeProof) return;
    await business("record_isolated_probe", {
      results: results.map(({ scopeAllowed: _, ...r }) => r),
    });
  } catch {
    /* opt-in probe failure remains NOT_RUN; never changes user data or reports success */
  }
}
