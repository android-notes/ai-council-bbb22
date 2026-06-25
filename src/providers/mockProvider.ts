import type { ModelRequest, ModelResponse, ConnectionTestResult } from "./types";

const stageLabel = {
  opening: {
    en: "initial view",
    zh: "初步观点",
  },
  rebuttal: {
    en: "rebuttal",
    zh: "反驳",
  },
  revision: {
    en: "revised stance",
    zh: "修正立场",
  },
  crossExam: {
    en: "cross-examination",
    zh: "交叉质询",
  },
  riskReview: {
    en: "risk review",
    zh: "风险审查",
  },
  vote: {
    en: "vote",
    zh: "投票",
  },
  summary: {
    en: "summary",
    zh: "总结",
  },
} as const;

export async function askMockModel(request: ModelRequest): Promise<ModelResponse> {
  await delay(180 + Math.random() * 260);

  const { language, mode, role, topic, stage } = request;
  const stageName = stageLabel[stage][language];
  const isZh = language === "zh";

  const angle = pickAngle(role.tone, mode, isZh);
  const challenge = pickChallenge(role.tone, isZh);
  const action = pickAction(role.tone, isZh);

  if (role.tone === "host" && stage === "summary") {
    return {
      content: isZh
        ? `主持人总结：围绕「${topic}」，本轮已经形成清晰分歧。支持方看重机会窗口，反方担心信息不足和执行代价。建议先把问题缩成一个可验证动作，再决定是否加码。

行动：
- 设计一个 7 天内可完成的小验证
- 写下继续投入和停止投入的信号
- 复盘验证结果后再扩大投入

风险：
- 把兴趣误判成真实需求
- 低估时间、现金流和切换成本
- 被单一立场带偏`
        : `Host summary: On "${topic}", the disagreement is now clear. Supporters emphasize the opportunity window, while skeptics worry about missing facts and execution cost. The next best move is to shrink the decision into one testable action before committing further.

Actions:
- Design a small validation that can finish within 7 days
- Write the signals for continuing or stopping investment
- Review the validation before expanding commitment

Risks:
- Mistaking interest for real demand
- Underestimating time, cash flow, and switching cost
- Being biased by one stance`,
    };
  }

  return {
    content: isZh
      ? `【${stageName}】${role.name}：我的立场是${angle}。关键不是立刻找一个漂亮答案，而是看这个选择是否经得起${challenge}。我建议下一步先做：${action}。`
      : `[${stageName}] ${role.name}: My stance is ${angle}. The key is not to chase a polished answer, but to test whether this choice survives ${challenge}. My next move would be: ${action}.`,
  };
}

export async function testMockConnection(): Promise<ConnectionTestResult> {
  await delay(180);
  return {
    ok: true,
    status: "connected",
    message: "Mock provider is ready.",
    latencyMs: 180,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pickAngle(tone: string, mode: string, isZh: boolean) {
  const zh = {
    host: "先控住讨论边界",
    support: mode === "arena" ? "大胆支持，先把戏剧张力拉满" : "有条件支持，但必须验证",
    skeptic: "暂时反对，直到关键假设被证明",
    risk: "保守推进，优先控制失败代价",
    creative: "寻找第三条路，不被二选一绑架",
    executor: "把抽象判断拆成可执行步骤",
  } as Record<string, string>;

  const en = {
    host: "to control the frame before judging",
    support: mode === "arena" ? "boldly supportive for maximum tension" : "conditionally supportive, pending validation",
    skeptic: "against it until the key assumptions are proven",
    risk: "to move conservatively and cap the downside first",
    creative: "to search for a third path instead of accepting a binary choice",
    executor: "to break the abstract judgment into concrete steps",
  } as Record<string, string>;

  return (isZh ? zh : en)[tone] ?? (isZh ? "保持谨慎" : "cautious");
}

function pickChallenge(tone: string, isZh: boolean) {
  const zh = {
    host: "目标、约束和分歧点",
    support: "真实用户或真实场景",
    skeptic: "反证和失败案例",
    risk: "现金流、时间和不可逆损失",
    creative: "替代方案和低成本试验",
    executor: "资源、节奏和责任人",
  } as Record<string, string>;

  const en = {
    host: "goals, constraints, and disagreement points",
    support: "real users or real situations",
    skeptic: "counterexamples and failure cases",
    risk: "cash flow, timing, and irreversible downside",
    creative: "alternative paths and low-cost experiments",
    executor: "resources, cadence, and ownership",
  } as Record<string, string>;

  return (isZh ? zh : en)[tone] ?? (isZh ? "压力测试" : "stress testing");
}

function pickAction(tone: string, isZh: boolean) {
  const zh = {
    host: "列出三个必须回答的问题",
    support: "做一次小规模验证，不要只停留在想象",
    skeptic: "写下最可能失败的三个原因",
    risk: "设定止损线和最长试验周期",
    creative: "设计一个更轻、更快的替代版本",
    executor: "把行动拆成 7 天内能完成的第一步",
  } as Record<string, string>;

  const en = {
    host: "list the three questions that must be answered",
    support: "run a small validation instead of staying in imagination",
    skeptic: "write the three most likely failure reasons",
    risk: "set a stop-loss line and a maximum test window",
    creative: "design a lighter and faster alternative version",
    executor: "break the work into a first step that can happen within 7 days",
  } as Record<string, string>;

  return (isZh ? zh : en)[tone] ?? (isZh ? "继续验证" : "validate further");
}
