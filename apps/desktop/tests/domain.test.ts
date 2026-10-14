import { describe, expect, it } from "vitest";
import {
  blankProject,
  emptyWorkspace,
  filterAssets,
  parseRoute,
  timeLabel,
} from "../src/domain";
import { SessionWorkspaceAdapter } from "../src/adapters/demo";
import { capabilities } from "../src/adapters/disconnected";
import { demoWorkspace } from "../src/fixtures/demo";
import { updateProject, workspaceSearch } from "../src/services";

describe("空间与服务边界", () => {
  it("个人工作区默认全空，没有示例成绩", async () => {
    expect(await new SessionWorkspaceAdapter().load("personal")).toEqual(
      emptyWorkspace(),
    );
  });
  it("每次示例装配独立，修改和重置不会污染个人或另一份示例", async () => {
    const adapter = new SessionWorkspaceAdapter();
    const a = await adapter.load("demo");
    const b = await adapter.load("demo");
    a.projects[0].script[0].text = "修改过";
    a.assets[0].favorite = false;
    expect(b.projects[0].script[0].text).not.toBe("修改过");
    expect(b.assets[0].favorite).toBe(true);
    expect(await adapter.load("personal")).toEqual(emptyWorkspace());
  });
  for (const key of Object.keys(capabilities) as (keyof typeof capabilities)[])
    it(`${key} 从服务层拒绝，不返回假任务`, async () => {
      expect(capabilities[key].capability.available).toBe(false);
      const response = await capabilities[key].request();
      expect(response.ok).toBe(false);
      expect(JSON.stringify(response)).not.toContain("jobId");
      expect(response).toMatchObject({
        ok: false,
        error: { code: "NOT_CONNECTED" },
      });
    });
  it("从参考创建项目只带关系，不复制台词", () => {
    const project = blankProject("demo-new", "我的原创主题", ["demo-shapes"]);
    expect(project.referenceIds).toEqual(["demo-shapes"]);
    expect(project.script).toEqual([]);
    expect(project.storyboard).toEqual([]);
    expect(project.brief.topic).toBe("");
  });
  it("编辑更新修订，保留其他项目与输入对象", () => {
    const w = demoWorkspace();
    const p = w.projects[0];
    const changed = updateProject(w, { ...p, title: "新的标题" });
    expect(changed.projects[0].revision).toBe(p.revision + 1);
    expect(w.projects[0].title).not.toBe("新的标题");
    expect(changed.projects[1]).toBe(w.projects[1]);
  });
});
describe("本地检索与路由", () => {
  it("中文标题、备注、标签与收藏筛选使用同一数据源", () => {
    const assets = demoWorkspace().assets;
    expect(filterAssets(assets, " 三段式 ", "all").map((a) => a.id)).toEqual([
      "demo-shapes",
    ]);
    expect(filterAssets(assets, "没有这个标题", "all")).toHaveLength(0);
    expect(filterAssets(assets, "", "favorite")).toHaveLength(1);
    expect(filterAssets(assets, "", "local")).toHaveLength(1);
    expect(filterAssets(assets, "", "link")).toHaveLength(1);
  });
  it("归档不会改变来源对象，搜索默认不返回归档对象", () => {
    const w = demoWorkspace();
    w.assets[0].archived = true;
    expect(filterAssets(w.assets, "", "all")).toHaveLength(2);
    expect(filterAssets(w.assets, "", "all", true)).toHaveLength(1);
    expect(workspaceSearch(w, "一个问题")).toHaveLength(0);
  });
  it("跨素材、项目、方法检索保留目的地", () => {
    const w = demoWorkspace();
    expect(workspaceSearch(w, "问题")[0].path).toBe("/analysis/demo-shapes");
    expect(workspaceSearch(w, "小短片")[0].path).toBe("/creator/demo-project");
    expect(workspaceSearch(w, "组织短片")[0].path).toBe("/methods");
  });
  it("打包应用使用本地深层 hash 路由", () => {
    expect(parseRoute("#/analysis/demo-shapes")).toEqual({
      page: "analysis",
      id: "demo-shapes",
      path: "/analysis/demo-shapes",
    });
    expect(parseRoute("/creator/demo-project").id).toBe("demo-project");
    expect(parseRoute("").path).toBe("/home");
  });
  it("无效页面、路径穿越、远程地址回到首页", () => {
    for (const invalid of [
      "/home/extra",
      "/analysis/../x",
      "https://example.com",
      "/creator/a/b",
      "/unknown",
    ])
      expect(parseRoute(invalid).path).toBe("/home");
  });
  it("时间只由整数毫秒计算，无伪字幕时间", () => {
    expect(timeLabel(4000)).toBe("00:04");
    expect(timeLabel(65000)).toBe("01:05");
  });
});
