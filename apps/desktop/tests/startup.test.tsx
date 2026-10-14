// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { ShellInfo } from "../src/domain";

const infoMock = vi.hoisted(() => vi.fn());
vi.mock("../src/adapters/desktop", () => ({
  shell: {
    info: infoMock,
    rememberRoute: vi.fn(async () => {}),
    onAction: vi.fn(async () => () => {}),
    quit: vi.fn(async () => {}),
  },
}));
const info: ShellInfo = {
  version: "0.1.0",
  platform: "macos",
  architecture: "aarch64",
  appData: "<test>",
  route: "/home",
  native: false,
};
afterEach(() => {
  cleanup();
  infoMock.mockReset();
  location.hash = "";
});
describe("真实异步启动状态", () => {
  it("原生信息尚未返回时显示 loading，不使用假计时进度", async () => {
    let resolve!: (value: ShellInfo) => void;
    infoMock.mockReturnValueOnce(
      new Promise<ShellInfo>((r) => {
        resolve = r;
      }),
    );
    render(<App />);
    expect(screen.getByText("正在打开本地工作台")).toBeTruthy();
    resolve(info);
    expect(await screen.findByText("你的创作空间，准备好了。")).toBeTruthy();
  });
  it("原生调用失败可见，并能重试，不永久白屏", async () => {
    infoMock
      .mockRejectedValueOnce(new Error("test failure"))
      .mockResolvedValueOnce(info);
    render(<App />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByText("你的创作空间，准备好了。")).toBeTruthy();
  });
});
