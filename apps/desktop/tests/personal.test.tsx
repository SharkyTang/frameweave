// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { emptyWorkspace, type VideoAsset } from "../src/domain";
import { NativeError } from "../src/adapters/desktop";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  update: vi.fn(),
  choose: vi.fn(),
  start: vi.fn(),
  get: vi.fn(),
  batch: vi.fn(),
  quit: vi.fn(),
  action: undefined as ((s: string) => void) | undefined,
}));
vi.mock("../src/adapters/desktop", async (original) => ({
  ...(await original<typeof import("../src/adapters/desktop")>()),
  shell: {
    info: async () => ({
      version: "0.1.0",
      platform: "macos",
      architecture: "aarch64",
      appData: "<test>",
      route: "/home",
      native: true,
    }),
    rememberRoute: vi.fn(async () => {}),
    onAction: vi.fn(async (handler: (s: string) => void) => {
      mocks.action = handler;
      return () => {};
    }),
    quit: mocks.quit,
  },
  personalMedia: {
    load: mocks.load,
    info: async () => ({
      ready: true,
      schemaVersion: 1,
      journalMode: "delete",
      recoveryWarnings: 0,
      maxFiles: 20,
      maxFileBytes: 5 * 1024 ** 3,
    }),
    updateAsset: mocks.update,
    getAsset: mocks.get,
    choose: mocks.choose,
    start: mocks.start,
    batch: mocks.batch,
    cancel: vi.fn(async () => {}),
    playback: vi.fn(async (id: string) => ({
      assetId: id,
      url: "./demo/three-scenes.mp4",
      contentHash: "a".repeat(64),
      playbackToken: "token",
    })),
    releasePlayback: vi.fn(async () => {}),
    metadata: vi.fn(async () => {}),
    playbackFailed: vi.fn(async () => {}),
  },
}));
const asset: VideoAsset = {
  id: "f36cd1e2-c0fa-4ff3-96c3-65d89b23472c",
  title: "个人原片",
  author: "手动导入",
  description: "原备注",
  tags: ["测试"],
  favorite: false,
  status: "available",
  source: "manual_import",
  poster: "local",
  learningGoal: "原目标",
  archived: false,
  revision: 3,
  sha256: "a".repeat(64),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  location.hash = "/library";
  mocks.action = undefined;
  mocks.load.mockResolvedValue({ ...emptyWorkspace(), assets: [{ ...asset }] });
  mocks.batch.mockResolvedValue(null);
  mocks.choose.mockResolvedValue({ files: [] });
  mocks.get.mockResolvedValue({ ...asset, revision: 9 });
  mocks.quit.mockResolvedValue(undefined);
  mocks.update.mockImplementation(async (input) => ({
    ...asset,
    ...input,
    revision: input.expectedRevision + 1,
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  location.hash = "";
});
async function edit() {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: asset.title }));
  return screen.findByRole("textbox", { name: "标题" });
}
describe("D3个人素材接线（组件证据，不是原生UI或SQLite证据）", () => {
  it("深层页在个人Repository就绪前等待，不抢先判素材不存在", async () => {
    location.hash = `/analysis/${asset.id}`;
    let resolve!: (v: unknown) => void;
    mocks.load.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<App />);
    expect(screen.getByText("正在打开本地工作台")).toBeTruthy();
    expect(
      screen.queryByText("当前个人资料库没有这条素材，请返回素材库选择。"),
    ).toBeNull();
    resolve({ ...emptyWorkspace(), assets: [asset] });
    expect(
      await screen.findByRole("heading", { name: asset.title }),
    ).toBeTruthy();
    expect(await screen.findByText("个人时间点笔记将在 D4 开放")).toBeTruthy();
    expect(screen.queryByText("QUESTION 与紫色方块")).toBeNull();
  });
  it("保存失败保留输入，并且只有Rust成功回应才显示已保存", async () => {
    const title = await edit();
    fireEvent.change(title, { target: { value: "中文😀<img src=x>" } });
    mocks.update.mockRejectedValueOnce(
      new NativeError({ code: "DB_WRITE_FAILED", message: "测试写入失败" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "保存素材资料" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "测试写入失败",
    );
    expect((title as HTMLInputElement).value).toBe("中文😀<img src=x>");
    expect(screen.queryByText("已保存到本机")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "保存素材资料" }));
    expect(await screen.findByText("已保存到本机")).toBeTruthy();
    expect(mocks.update.mock.calls[1][0].expectedRevision).toBe(3);
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("修订冲突不覆盖新资料；显式刷新修订后保留输入再次确认", async () => {
    const title = await edit();
    fireEvent.change(title, { target: { value: "保留我的输入" } });
    mocks.update.mockRejectedValueOnce(
      new NativeError({ code: "REVISION_CONFLICT", message: "资料已更新" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "保存素材资料" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "读取最新修订，保留输入" }),
    );
    await screen.findByText(
      "已读取最新修订，输入已保留。再次保存将按你的输入更新资料。",
    );
    expect((title as HTMLInputElement).value).toBe("保留我的输入");
    fireEvent.click(screen.getByRole("button", { name: "保存素材资料" }));
    await screen.findByText("已保存到本机");
    expect(mocks.update.mock.calls[1][0]).toMatchObject({
      title: "保留我的输入",
      expectedRevision: 9,
    });
  });
  it("未保存资料的Esc和Cmd+Q保护保留表单，成功保存后退出不假报dirty", async () => {
    const title = await edit();
    fireEvent.change(title, { target: { value: "待保存输入" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      await screen.findByRole("heading", { name: "素材资料尚未保存" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect((title as HTMLInputElement).value).toBe("待保存输入");
    mocks.action!("quit");
    await screen.findByRole("button", { name: "放弃未保存资料并退出" });
    expect(mocks.quit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "保存素材资料" }));
    await screen.findByText("已保存到本机");
    mocks.action!("quit");
    await waitFor(() => expect(mocks.quit).toHaveBeenCalledOnce());
  });
  it("组合输入确认Enter和原生保存动作不会误提交", async () => {
    const title = await edit();
    fireEvent.change(title, { target: { value: "输入法组合" } });
    fireEvent.compositionStart(title);
    fireEvent.keyDown(title, { key: "Enter", isComposing: true });
    mocks.action!("save");
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.compositionEnd(title);
    fireEvent.click(screen.getByRole("button", { name: "保存素材资料" }));
    await screen.findByText("已保存到本机");
  });
  it("收藏失败不伪装成功，不更新个人数据", async () => {
    render(<App />);
    mocks.update.mockRejectedValueOnce(
      new NativeError({ code: "DB_WRITE_FAILED", message: "收藏失败" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: `收藏：${asset.title}` }),
    );
    expect(await screen.findByText("收藏失败")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: `收藏：${asset.title}` }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: `取消收藏：${asset.title}` }),
    ).toBeNull();
  });
  it("演示切换和重置不会调用个人写入命令，也不替换个人素材", async () => {
    render(<App />);
    await screen.findByRole("button", { name: asset.title });
    fireEvent.click(screen.getByTitle("切换个人空间 / 演示空间"));
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "恢复初始示例" }));
    fireEvent.click(screen.getByRole("button", { name: "恢复示例" }));
    fireEvent.click(screen.getByTitle("切换个人空间 / 演示空间"));
    fireEvent.click(screen.getByRole("button", { name: "灵感素材库" }));
    expect(
      await screen.findByRole("button", { name: asset.title }),
    ).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("原生选择取消不会建立假导入批次或失败", async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "导入本地视频" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "选择视频并复制" }));
    await waitFor(() => expect(mocks.choose).toHaveBeenCalledOnce());
    expect(mocks.start).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("逐项失败和导入中退出的两条路径清楚，不冒充下载任务", async () => {
    const batch = {
      id: "batch",
      active: true,
      items: [
        {
          id: "a",
          filename: "good.mp4",
          state: "imported",
          bytesCopied: 24,
          totalBytes: 24,
          assetId: asset.id,
        },
        {
          id: "b",
          filename: "bad.mp4",
          state: "failed",
          bytesCopied: 0,
          totalBytes: 24,
          error: { code: "IO_FAILED", message: "本项失败" },
        },
        {
          id: "c",
          filename: "waiting.mp4",
          state: "queued",
          bytesCopied: 0,
          totalBytes: 24,
        },
      ],
    };
    mocks.batch.mockResolvedValue(batch);
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "导入本地视频" }),
    );
    expect(await screen.findByText("本项失败")).toBeTruthy();
    expect(
      within(screen.getByRole("dialog", { name: "导入本地视频" })).getByText(
        "已入库 · 播放待验证",
      ),
    ).toBeTruthy();
    mocks.action!("quit");
    fireEvent.click(await screen.findByRole("button", { name: "继续导入" }));
    expect(mocks.quit).not.toHaveBeenCalled();
    mocks.action!("quit");
    fireEvent.click(
      await screen.findByRole("button", { name: "取消未完成导入并退出" }),
    );
    await waitFor(() => expect(mocks.quit).toHaveBeenCalledOnce());
    expect(JSON.stringify(batch)).not.toContain("jobId");
  });
});
