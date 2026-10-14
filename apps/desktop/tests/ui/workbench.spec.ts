import { expect, test, type Page } from "@playwright/test";
async function enterDemo(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator(".space-switch").click();
  await expect(page.locator(".demo-banner")).toBeVisible();
}
async function route(page: Page, path: string) {
  await page.evaluate((path) => {
    location.hash = path;
  }, path);
}
const destinations = [
  "/home",
  "/library",
  "/analysis/demo-shapes",
  "/creator/demo-project",
  "/methods",
  "/works",
  "/radar",
  "/settings",
];

test("首次个人空间与八个空态页面；未接入说明准确", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await expect(page.getByText("第一条参考，值得认真留下。")).toBeVisible();
  for (const path of destinations) {
    await route(page, path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".demo-banner")).toHaveCount(0);
  }
  await route(page, "/home");
  await page.getByRole("button", { name: "导入参考素材", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("原文件不会移动或删除");
  await expect(page.getByRole("dialog")).not.toContainText("导入成功");
});
for (const width of [1024, 1280, 1440, 1728])
  test(`八个页面在 ${width} 宽度无正文横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await enterDemo(page);
    const brandBounds = await page
      .locator(".brand-name strong")
      .evaluate((el) => {
        const sidebar = el.closest(".sidebar")!;
        return {
          right: el.getBoundingClientRect().right,
          sidebarRight: sidebar.getBoundingClientRect().right,
          overflow: el.scrollWidth - el.clientWidth,
        };
      });
    expect(brandBounds.right).toBeLessThanOrEqual(brandBounds.sidebarRight);
    expect(brandBounds.overflow).toBeLessThanOrEqual(1);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of destinations) {
      await route(page, path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page
          .locator("main")
          .evaluate((el) => ({
            scroll: el.scrollWidth,
            client: el.clientWidth,
          }))
          .then((v) => v.scroll - v.client),
        path,
      ).toBeLessThanOrEqual(1);
      await expect(page.locator("nav button[aria-current=page]")).toHaveCount(
        1,
      );
      if (width === 1440)
        await page.screenshot({
          path: `../../docs/desktop-workbench/frameweave-d3/screenshots/browser-${path.split("/")[1]}.png`,
        });
    }
    expect(errors).toEqual([]);
  });
test("示例搜索、收藏筛选、详情与学习到原创项目流程", async ({ page }) => {
  await enterDemo(page);
  await route(page, "/library");
  await page.getByRole("textbox", { name: "搜索素材" }).fill("三段式");
  await expect(page.locator(".asset-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "取消收藏：一个问题，三个画面" })
    .click();
  await page.getByRole("tab", { name: "我的收藏" }).click();
  await expect(page.locator(".asset-card")).toHaveCount(0);
  await page.getByRole("tab", { name: "全部素材" }).click();
  await page.getByRole("textbox", { name: "搜索素材" }).fill("");
  await page
    .getByRole("button", { name: "一个问题，三个画面", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "进入学习空间" }).click();
  await expect(page.locator("video")).toBeVisible();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.duration),
    )
    .toBeCloseTo(12, 1);
  await page.getByRole("button", { name: "从参考开始创作" }).click();
  await page.getByRole("textbox", { name: "项目标题" }).fill("我的原创练习");
  await page.getByRole("button", { name: "创建示例项目" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "我的原创练习",
  );
  await page
    .getByRole("textbox", { name: "主题 / 核心表达" })
    .fill("只用自己的表达");
  await page.getByRole("tab", { name: "分段脚本" }).click();
  await page.getByRole("button", { name: "使用空白模板" }).click();
  await page
    .getByRole("textbox", { name: "旁白 / 对白" })
    .first()
    .fill("这是我自己的开头。");
  await page.getByRole("tab", { name: "分镜表", exact: true }).click();
  await page.getByRole("button", { name: "添加分镜" }).click();
  await page.getByRole("textbox", { name: "分镜 1 画面" }).fill("窗边拍摄");
  await page.getByRole("tab", { name: "拍摄清单" }).click();
  await page.getByRole("button", { name: "添加事项" }).click();
  await page.getByRole("textbox", { name: "拍摄事项" }).fill("准备手机");
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("tab", { name: "分段脚本" }).click();
  await expect(
    page.getByRole("textbox", { name: "旁白 / 对白" }).first(),
  ).toHaveValue("这是我自己的开头。");
  await page.getByRole("button", { name: "AI 生成方案" }).click();
  await expect(page.getByRole("dialog")).toContainText("尚未接入");
});
test("自制视频可播、seek、倍速和时间点笔记；缺失媒体与字幕状态明确", async ({
  page,
}) => {
  await enterDemo(page);
  await route(page, "/analysis/demo-shapes");
  await page.locator("video").evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    await v.play();
  });
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(0.2);
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await page.locator(".timeline-notes").getByRole("button").nth(1).click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeCloseTo(4, 1);
  await page.getByRole("combobox", { name: "播放倍速" }).selectOption("1.5");
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.playbackRate),
  ).toBe(1.5);
  await page.getByRole("button", { name: "添加笔记", exact: true }).click();
  await page
    .getByRole("textbox", { name: "观察内容" })
    .fill("在 4 秒处观察三个框");
  await page.getByRole("button", { name: "更新示例笔记" }).click();
  await expect(
    page.getByRole("button", { name: "在 4 秒处观察三个框", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "文案 / 字幕" }).click();
  await expect(page.getByText("这份自制示例没有字幕")).toBeVisible();
  await route(page, "/analysis/demo-missing");
  await expect(
    page.getByRole("heading", { name: "示例：媒体文件缺失" }),
  ).toBeVisible();
  await route(page, "/analysis/demo-link");
  await expect(
    page.getByRole("heading", { name: "未关联本地视频" }),
  ).toBeVisible();
});
test("弹窗焦点、Esc 和返回焦点；中文长标题与 HTML 按文本处理", async ({
  page,
}) => {
  await enterDemo(page);
  const trigger = page.getByRole("button", { name: "搜索与命令" });
  await trigger.click();
  await expect(page.getByRole("textbox", { name: "搜索与命令" })).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest("[role=dialog]"),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "新建创作项目", exact: true }).click();
  const longTitle =
    "中文长标题与空格 # % " +
    "创作练习".repeat(15) +
    "<img src=x onerror=alert(1)>";
  await page.getByRole("textbox", { name: "项目标题" }).fill(longTitle);
  await page.getByRole("button", { name: "创建示例项目" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(longTitle);
  await expect(page.locator("h1 img")).toHaveCount(0);
  expect(
    await page
      .locator("main")
      .evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
});
test("演示编辑重置与个人空间隔离；应用无外部请求", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:1420"))
      external.push(request.url());
  });
  await enterDemo(page);
  await route(page, "/creator/demo-project");
  await page.getByRole("textbox", { name: "项目标题" }).fill("修改的示例");
  await route(page, "/settings");
  await page.getByRole("button", { name: "恢复初始示例" }).click();
  await page.getByRole("button", { name: "恢复示例", exact: true }).click();
  await route(page, "/creator/demo-project");
  await expect(page.getByRole("textbox", { name: "项目标题" })).toHaveValue(
    "把一个想法，拍成一支小短片",
  );
  await page.locator(".space-switch").click();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await expect(page.getByText("第一条参考，值得认真留下。")).toBeVisible();
  expect(external).toEqual([]);
});

test("方法编辑与引用；作品阶段和手动复盘共用项目", async ({ page }) => {
  await enterDemo(page);
  await route(page, "/methods");
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("textbox", { name: "方法标题" }).fill("我的三段式方法");
  await page.getByRole("button", { name: "更新示例方法" }).click();
  await expect(
    page.getByRole("heading", { name: "我的三段式方法" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "用于创作", exact: true }).click();
  await page.getByRole("button", { name: "引用方法并打开项目" }).click();
  await expect(page.locator(".reference-method")).toContainText(
    "我的三段式方法",
  );
  await route(page, "/works");
  await page
    .getByRole("button", { name: "手动复盘", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "下次练习" })
    .fill("用自己的镜头练习");
  await page.getByRole("button", { name: "完成本次示例复盘" }).click();
  await page
    .getByRole("button", { name: "手动复盘", exact: true })
    .first()
    .click();
  await expect(page.getByRole("textbox", { name: "下次练习" })).toHaveValue(
    "用自己的镜头练习",
  );
});
