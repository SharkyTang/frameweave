import { blankProject, type Workspace } from "../domain";

export function demoWorkspace(): Workspace {
  const first = blankProject("demo-project", "把一个想法，拍成一支小短片", [
    "demo-shapes",
  ]);
  first.stage = "待拍摄";
  first.brief = {
    topic: "用三个画面讲清楚一个创作想法",
    audience: "第一次拍短视频的人",
    duration: "30 秒",
    platform: "未指定",
    style: "清晰、简洁、有节奏",
    equipment: "手机 + 桌面支架",
    location: "窗边书桌",
    appearing: "只拍双手",
    team: "独立制作",
  };
  first.script = [
    {
      id: "s1",
      name: "提出问题",
      duration: "5",
      text: "有想法，却不知道从哪里开始拍？",
      note: "示例手写脚本；与合成参考片并非逐字对应",
    },
    {
      id: "s2",
      name: "展示过程",
      duration: "18",
      text: "把它拆成三个画面：一个问题、一个行动、一个结果。先写下来，再拿起手机。",
      note: "将抽象想法变成可拍摄的动作",
    },
    {
      id: "s3",
      name: "给出结果",
      duration: "7",
      text: "今天，只完成这三个镜头。让第一个作品发生。",
      note: "以清楚的行动建议结束",
    },
  ];
  first.storyboard = [
    {
      id: "b1",
      duration: "5",
      shot: "俯拍 / 特写",
      visual: "手把空白纸放到桌上，写下问题",
      dialogue: "有想法，却不知道从哪里开始拍？",
      props: "纸、笔",
    },
    {
      id: "b2",
      duration: "18",
      shot: "俯拍 / 中近景",
      visual: "在纸上画三个框，依次填入动作",
      dialogue: "一个问题、一个行动、一个结果。",
      props: "纸、笔、手机",
    },
    {
      id: "b3",
      duration: "7",
      shot: "正面 / 特写",
      visual: "拿起手机，按下录制按钮",
      dialogue: "让第一个作品发生。",
      props: "手机支架",
    },
  ];
  first.checklist = [
    { id: "t1", text: "整理窗边书桌，测试自然光", done: true },
    { id: "t2", text: "准备纸、笔和手机支架", done: false },
    { id: "t3", text: "录制一遍旁白，检查环境声音", done: false },
    { id: "t4", text: "拍摄三个画面，每个保留两遍", done: false },
  ];
  first.editing =
    "按“问题 → 行动 → 结果”的顺序剪辑。字幕只保留关键词，转场用直接切换。声音记录为人工计划，未分析 BGM。";
  first.methodIds = ["demo-method"];
  const second = blankProject("demo-review", "我的第一次三镜头练习");
  second.stage = "待复盘";
  second.review = {
    goal: "练习三个画面表达一个完整想法",
    strengths: "开头的问题很明确",
    problems: "中间动作停留时间过长",
    changes: "减少重复动作，补拍一个结果特写",
    practice: "下次练习每个画面只表达一个意思",
  };
  return {
    assets: [
      {
        id: "demo-shapes",
        title: "一个问题，三个画面",
        author: "工作台自制示例",
        description:
          "12 秒合成短片：方块提出问题，三个框展示过程，圆环表示结果。非真实平台视频。",
        tags: ["叙事结构", "三段式", "合成示例"],
        favorite: true,
        status: "available",
        source: "demo",
        poster: "shapes",
        durationMs: 12000,
        learningGoal: "观察一个想法如何从问题走到结果",
        archived: false,
      },
      {
        id: "demo-link",
        title: "留给下一次观察的参考链接",
        author: "虚构示例",
        description:
          "仅展示参考链接记录的形态，不包含远程网址，不请求远程内容。",
        tags: ["开头设计", "待学习"],
        favorite: false,
        status: "link_only",
        source: "link",
        poster: "link",
        learningGoal: "记住值得观察的开头",
        archived: false,
      },
      {
        id: "demo-missing",
        title: "缺失媒体时，学习笔记仍在",
        author: "状态示例",
        description: "用于验证文件缺失界面；未绑定真实文件。",
        tags: ["节奏", "状态示例"],
        favorite: false,
        status: "missing",
        source: "demo",
        poster: "missing",
        durationMs: 12000,
        learningGoal: "查看可恢复的缺失媒体状态",
        archived: false,
      },
    ],
    notes: [
      {
        id: "n1",
        assetId: "demo-shapes",
        timeMs: 0,
        dimension: "开头",
        text: "画面只有一个紫色方块和 QUESTION，先把注意力放到一个问题上。",
        origin: "demo",
      },
      {
        id: "n2",
        assetId: "demo-shapes",
        timeMs: 4000,
        dimension: "结构",
        text: "PROCESS 画面用三个框表示过程。可以借鉴三段结构，不照搬示例的画面内容。",
        origin: "demo",
      },
      {
        id: "n3",
        assetId: "demo-shapes",
        timeMs: 8000,
        dimension: "可复用方法",
        text: "RESULT 画面出现圆环。结尾给出明确结果，避免突然结束。",
        origin: "demo",
      },
    ],
    projects: [first, second],
    methods: [
      {
        id: "demo-method",
        title: "用「问题 → 过程 → 结果」组织短片",
        scenario: "解释一个方法、记录一次练习、展示制作过程",
        steps:
          "1. 用一个具体问题开头。\n2. 用少量画面展示关键行动。\n3. 用明确结果结束，并留下一个可执行的下一步。",
        caution: "结构是模板。使用自己的主题和镜头，不复制参考片的台词或成品。",
        tags: ["叙事结构", "三段式"],
        assetId: "demo-shapes",
        sourceTitle: "一个问题，三个画面",
        timeMs: 4000,
        verified: false,
        archived: false,
      },
    ],
    interests: ["知识分享", "生活记录"],
    excludedTopics: "示例：纯搬运内容",
  };
}
