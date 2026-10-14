export type Space = "personal" | "demo";
export type Page =
  | "home"
  | "library"
  | "analysis"
  | "creator"
  | "methods"
  | "works"
  | "radar"
  | "settings";
export type Stage = "构思" | "脚本" | "待拍摄" | "剪辑中" | "待复盘" | "已归档";
export type MediaStatus = "available" | "link_only" | "missing" | "unsupported";
export interface VideoAsset {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  favorite: boolean;
  status: MediaStatus;
  source: "demo" | "link";
  poster: string;
  durationMs?: number;
  learningGoal: string;
  archived: boolean;
}
export interface LearningNote {
  id: string;
  assetId: string;
  timeMs: number;
  dimension: string;
  text: string;
  origin: "demo" | "user_authored";
}
export interface ScriptSegment {
  id: string;
  name: string;
  duration: string;
  text: string;
  note: string;
}
export interface Storyboard {
  id: string;
  duration: string;
  shot: string;
  visual: string;
  dialogue: string;
  props: string;
}
export interface Task {
  id: string;
  text: string;
  done: boolean;
}
export interface CreativeProject {
  id: string;
  title: string;
  stage: Stage;
  referenceIds: string[];
  methodIds: string[];
  revision: number;
  brief: {
    topic: string;
    audience: string;
    duration: string;
    platform: string;
    style: string;
    equipment: string;
    location: string;
    appearing: string;
    team: string;
  };
  script: ScriptSegment[];
  storyboard: Storyboard[];
  checklist: Task[];
  editing: string;
  review: {
    goal: string;
    strengths: string;
    problems: string;
    changes: string;
    practice: string;
  };
}
export interface MethodCard {
  id: string;
  title: string;
  scenario: string;
  steps: string;
  caution: string;
  tags: string[];
  assetId?: string;
  sourceTitle: string;
  timeMs?: number;
  verified: boolean;
  archived: boolean;
}
export interface Workspace {
  assets: VideoAsset[];
  notes: LearningNote[];
  projects: CreativeProject[];
  methods: MethodCard[];
  interests: string[];
  excludedTopics: string;
}
export interface Capability {
  available: false;
  state: "not_configured" | "disconnected";
  reason: string;
}
export interface AppError {
  code: "NOT_CONNECTED" | "NOT_IMPLEMENTED";
  message: string;
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
export interface ShellInfo {
  version: string;
  platform: string;
  architecture: string;
  appData: string;
  route: string;
  native: boolean;
}
export const stages: Stage[] = [
  "构思",
  "脚本",
  "待拍摄",
  "剪辑中",
  "待复盘",
  "已归档",
];
export const emptyWorkspace = (): Workspace => ({
  assets: [],
  notes: [],
  projects: [],
  methods: [],
  interests: [],
  excludedTopics: "",
});
export function blankProject(
  id: string,
  title: string,
  referenceIds: string[] = [],
): CreativeProject {
  return {
    id,
    title,
    referenceIds,
    methodIds: [],
    stage: "构思",
    revision: 0,
    brief: {
      topic: "",
      audience: "",
      duration: "",
      platform: "",
      style: "",
      equipment: "",
      location: "",
      appearing: "",
      team: "",
    },
    script: [],
    storyboard: [],
    checklist: [],
    editing: "",
    review: {
      goal: "",
      strengths: "",
      problems: "",
      changes: "",
      practice: "",
    },
  };
}
export const timeLabel = (ms: number) =>
  `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
export function filterAssets(
  assets: VideoAsset[],
  query: string,
  filter: string,
  archived = false,
) {
  const keyword = query.trim().toLocaleLowerCase();
  return assets.filter(
    (a) =>
      a.archived === archived &&
      `${a.title} ${a.description} ${a.tags.join(" ")}`
        .toLocaleLowerCase()
        .includes(keyword) &&
      (filter === "all" ||
        (filter === "favorite" && a.favorite) ||
        (filter === "local" && a.status === "available") ||
        (filter === "link" && a.status === "link_only")),
  );
}
export function parseRoute(raw: string): {
  page: Page;
  id?: string;
  path: string;
} {
  const path = raw.replace(/^#/, "") || "/home";
  const match =
    /^\/(home|library|analysis|creator|methods|works|radar|settings)(?:\/([a-zA-Z0-9_-]{1,128}))?$/.exec(
      path,
    );
  if (
    !match ||
    (match[2] && !["analysis", "creator", "works"].includes(match[1]))
  )
    return { page: "home", path: "/home" };
  return { page: match[1] as Page, id: match[2], path };
}
