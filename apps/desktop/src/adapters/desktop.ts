import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ShellPort } from "../ports";
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
