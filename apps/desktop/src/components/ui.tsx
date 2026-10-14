import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Film,
  Inbox,
  Play,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import type { VideoAsset } from "../domain";

export function Button({
  children,
  icon: Icon,
  tone = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  tone?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button type="button" className={`button ${tone} ${className}`} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}
export function IconButton({
  icon: Icon,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "purple" | "green" | "amber";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtle">{description}</p>
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export function SectionTitle({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {note && <p className="subtle">{note}</p>}
      </div>
      {children}
    </div>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  children,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={28} aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="empty-actions">{children}</div>
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const tabRef = useRef<HTMLDivElement>(null);
  return (
    <div className="tabs" role="tablist" aria-label={label} ref={tabRef}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          tabIndex={item.id === value ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        items.length) %
                      items.length;
              onChange(items[next].id);
              (tabRef.current?.children[next] as HTMLElement)?.focus();
            }
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
    (
      focusables().find((el) => ["INPUT", "TEXTAREA"].includes(el.tagName)) ??
      focusables()[0] ??
      ref.current
    )?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const elements = focusables();
        const first = elements[0];
        const last = elements.at(-1);
        if (!first) {
          event.preventDefault();
          ref.current?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => {
      document.removeEventListener("keydown", handler, true);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className={`modal-overlay ${drawer ? "drawer-overlay" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${drawer ? "drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-title">
          <h2 id={id}>{title}</h2>
          <IconButton icon={X} label="关闭弹窗" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
export function Poster({
  kind = "shapes",
  small = false,
}: {
  kind?: string;
  small?: boolean;
}) {
  return (
    <div
      className={`poster poster-${kind} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      <div className="poster-grain" />
      <span className="poster-caption">
        {kind === "shapes"
          ? "FROM AN IDEA"
          : kind === "link"
            ? "NEXT INSPIRATION"
            : "KEEP THE NOTES"}
      </span>
      {kind === "shapes" ? (
        <div className="shape-composition">
          <div className="shape-square" />
          <div className="shape-circle" />
          <div className="shape-line" />
        </div>
      ) : kind === "link" ? (
        <div className="link-art">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <Film className="missing-art" size={48} />
      )}
      <span className="poster-bottom">
        {kind === "shapes"
          ? "一个问题，三个画面"
          : kind === "link"
            ? "下一次灵感，从这里开始"
            : "媒体缺失 · 笔记保留"}
      </span>
    </div>
  );
}
export function AssetCard({
  asset,
  noteCount,
  onOpen,
  onFavorite,
  list = false,
}: {
  asset: VideoAsset;
  noteCount: number;
  onOpen: () => void;
  onFavorite: () => void;
  list?: boolean;
}) {
  const status = {
    available: "自制演示 · 00:12",
    link_only: "未关联本地视频",
    missing: "示例：文件缺失",
    unsupported: "格式不支持",
  }[asset.status];
  return (
    <article className={`asset-card ${list ? "list-card" : ""}`}>
      <button
        className="poster-button"
        onClick={onOpen}
        aria-label={`打开素材：${asset.title}`}
      >
        <Poster kind={asset.poster} />
        <span className="video-badge">{status}</span>
        {asset.status === "available" && (
          <span className="play-bubble">
            <Play size={17} fill="currentColor" />
          </span>
        )}
      </button>
      <div className="asset-body">
        <div className="asset-title">
          <button onClick={onOpen}>{asset.title}</button>
          <IconButton
            icon={Star}
            label={
              asset.favorite
                ? `取消收藏：${asset.title}`
                : `收藏：${asset.title}`
            }
            aria-pressed={asset.favorite}
            onClick={onFavorite}
          />
        </div>
        <p className="subtle">
          {asset.author} <span>·</span> {noteCount} 条笔记
        </p>
        <div className="tag-row">
          {asset.tags.slice(0, 3).map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {list && (
          <Button icon={ArrowRight} tone="ghost" onClick={onOpen}>
            进入学习
          </Button>
        )}
      </div>
    </article>
  );
}
