import { useRef, useState } from "react";
import {
  Check,
  Database,
  FileText,
  FolderOpen,
  Info,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useWorkbench } from "../app/context";
import {
  Badge,
  Button,
  Card,
  Field,
  PageTitle,
  SectionTitle,
} from "../components/ui";

export function Settings() {
  const c = useWorkbench();
  const [density, setDensity] = useState(
    document.documentElement.dataset.density ?? "normal",
  );
  const diagnostics = useRef<HTMLTextAreaElement>(null);
  const diag = `逆向轻抖 ${c.info?.version ?? "0.1.0"}\n阶段: D2\n环境: ${c.info?.native ? "Tauri 桌面" : "浏览器组件预览"}\n平台: ${c.info?.platform ?? "读取中"} / ${c.info?.architecture ?? "读取中"}\n资料目录: <应用资料目录>\n业务数据库: 尚未建立（D3）\nAI / 下载插件: 未接入\n本次空间: ${c.space === "demo" ? "演示" : "个人"}\n包含个人脚本或媒体: 否`;
  return (
    <>
      <PageTitle
        eyebrow="A QUIET, LOCAL WORKSPACE"
        title="设置"
        description="让工作台适合你，也让每种能力的状态清楚可见。"
      />
      <div className="settings-grid">
        <div className="settings-main">
          <Card className="settings-section">
            <SectionTitle title="外观" note="系统字体、完整浅色主题。" />
            <div className="setting-row">
              <span className="setting-icon">
                <Monitor size={20} />
              </span>
              <div>
                <strong>浅色外观</strong>
                <p className="subtle">柔和紫蓝与清楚的内容层级</p>
              </div>
              <Badge tone="green">
                <Check size={12} /> 已启用
              </Badge>
            </div>
            <Field label="界面密度（本次会话）">
              <select
                value={density}
                onChange={(e) => {
                  setDensity(e.target.value);
                  document.documentElement.dataset.density = e.target.value;
                }}
              >
                <option value="normal">标准</option>
                <option value="comfortable">宽松</option>
              </select>
            </Field>
          </Card>
          <Card className="settings-section">
            <SectionTitle
              title="本地资料"
              note="桌面壳已经创建专用资料目录，业务数据库将在 D3 加入。"
            />
            <div className="data-path">
              <FolderOpen size={18} />
              <code>{c.info?.appData ?? "正在读取原生资料目录…"}</code>
            </div>
            <div className="setting-row">
              <span className="setting-icon">
                <Database size={20} />
              </span>
              <div>
                <strong>个人 SQLite 与媒体资料库</strong>
                <p className="subtle">D3 接入真实导入、复制与重启恢复</p>
              </div>
              <Badge>尚未建立</Badge>
            </div>
            <div className="stack-actions">
              <Button
                icon={Database}
                onClick={() =>
                  c.unavailable(
                    "元数据备份 · D7",
                    "D7 将使用一致性 SQLite 备份。元数据备份不包含视频文件；当前没有业务数据库，不生成假备份。",
                  )
                }
              >
                备份说明
              </Button>
              <Button
                icon={RefreshCw}
                onClick={() =>
                  c.unavailable(
                    "元数据恢复 · D7",
                    "恢复前会校验版本和完整性，并保留当前库备份。当前阶段未接入恢复操作。",
                  )
                }
              >
                恢复说明
              </Button>
            </div>
          </Card>
          <Card className="settings-section">
            <SectionTitle
              title="演示空间"
              note="示例与个人空间使用独立数据源，演示编辑不落盘。"
            />
            <div className="setting-row">
              <span className="setting-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <strong>
                  {c.space === "demo" ? "当前位于演示空间" : "当前位于个人空间"}
                </strong>
                <p className="subtle">自制短片、手写拆解、创作编辑和方法卡</p>
              </div>
              <Button
                onClick={() =>
                  c.changeSpace(c.space === "demo" ? "personal" : "demo")
                }
              >
                {c.space === "demo" ? "离开演示" : "进入演示"}
              </Button>
            </div>
            <Button
              icon={RefreshCw}
              onClick={() => c.setDialog({ type: "reset" })}
            >
              恢复初始示例
            </Button>
            <p className="subtle">
              只替换示例数据，不删除任何个人资料或外部文件。
            </p>
          </Card>
          <Card className="settings-section">
            <SectionTitle
              title="脱敏诊断信息"
              note="不含脚本、字幕、完整用户路径或密钥。"
            />
            <textarea
              readOnly
              rows={8}
              ref={diagnostics}
              aria-label="脱敏诊断信息"
              className="diagnostics-text"
              value={diag}
            />
            <Button
              icon={FileText}
              onClick={() => {
                diagnostics.current?.focus();
                diagnostics.current?.select();
              }}
            >
              选中诊断信息 · ⌘C 复制
            </Button>
          </Card>
        </div>
        <aside className="settings-aside">
          <Card className="app-info-card">
            <div className="app-info-logo">
              <Monitor size={29} />
            </div>
            <h2>逆向轻抖</h2>
            <p className="subtle">视频创作者的本地工作台</p>
            <Badge tone="purple">
              V{c.info?.version ?? "0.1.0"} · D2 桌面预览
            </Badge>
            <div className="detail-info">
              <span>运行环境</span>
              <strong>
                {c.info?.native ? "Tauri / WKWebView" : "浏览器预览"}
              </strong>
              <span>原生层</span>
              <strong>{c.info?.native ? "已实际响应" : "预览中不可用"}</strong>
              <span>图标</span>
              <strong>临时应用图标</strong>
            </div>
          </Card>
          <Card className="settings-section">
            <h2>连接状态</h2>
            {[
              { name: "视频 / 文案下载插件", note: "独立开发，本版不接入" },
              { name: "AI 拆解与创作", note: "未配置，无需 API Key" },
              { name: "爆款雷达", note: "规划中，无榜单采集" },
            ].map((item) => (
              <div className="capability-row" key={item.name}>
                <span className="offline-dot" />
                <div>
                  <strong>{item.name}</strong>
                  <p className="subtle">{item.note}</p>
                </div>
              </div>
            ))}
          </Card>
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <div>
              <h4>资料留在本机</h4>
              <p>
                生产应用内置界面和示例资源，不加载远程字体、图片或脚本。没有账号、云同步或遥测。
              </p>
            </div>
          </div>
          <div className="source-note">
            <h4>D2 的边界</h4>
            <p>
              桌面窗口和菜单可用。真实视频导入、业务存储、导出与备份将按后续阶段实现。
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
