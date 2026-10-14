import type { CapabilityPort } from "../ports";
export function disconnected(reason: string): CapabilityPort {
  return {
    capability: { state: "disconnected", available: false, reason },
    async request() {
      return { ok: false, error: { code: "NOT_CONNECTED", message: reason } };
    },
  };
}
export const capabilities = {
  analysis: disconnected(
    "AI 深度拆解尚未接入。当前可以在演示空间查看手动编写的示例拆解。",
  ),
  creation: disconnected(
    "AI 创作尚未接入。示例编辑器支持手动编辑，不生成 AI 方案。",
  ),
  acquisition: disconnected("视频 / 文案下载插件独立开发，本版本尚未接入。"),
  radar: disconnected("爆款雷达处于规划阶段，没有榜单来源或后台采集。"),
};
