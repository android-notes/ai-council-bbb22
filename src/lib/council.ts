import type {
  AppMode,
  CouncilMessage,
  CouncilResult,
  CouncilRole,
  CouncilSession,
  DepthPreset,
  Language,
  ModelConnection,
} from "../types";
import { createId } from "./id";

export function createMockConnection(): ModelConnection {
  return {
    id: "mock",
    name: "Mock Provider",
    protocol: "mock",
    baseUrl: "local://mock",
    model: "mock-council",
    secretStorage: "session",
    status: "connected",
    statusMessage: "Ready",
  };
}

export function generateRoles(
  mode: AppMode,
  topic: string,
  language: Language,
  modelConnectionId = "mock"
): CouncilRole[] {
  const isZh = language === "zh";
  const roleSet =
    mode === "arena"
      ? [
          role("host", isZh ? "主持人" : "Host", isZh ? "控场、追问、宣布分歧" : "Frames the debate, pushes tension, and names the split.", "host"),
          role("support", isZh ? "激进支持派" : "Bold Supporter", isZh ? "把支持理由讲到最强" : "Makes the strongest possible supportive case.", "support"),
          role("skeptic", isZh ? "毒舌反方" : "Sharp Skeptic", isZh ? "专门拆台，指出自欺和漏洞" : "Challenges assumptions and calls out weak reasoning.", "skeptic"),
          role("risk", isZh ? "现实保守派" : "Realist", isZh ? "盯住代价、资源和失败后果" : "Focuses on costs, constraints, and downside.", "risk"),
          role("creative", isZh ? "金句官" : "Quote Maker", isZh ? "负责制造可分享的反转和金句" : "Turns the debate into memorable, shareable lines.", "creative"),
        ]
      : [
          role("host", isZh ? "主持人" : "Host", isZh ? "定义问题、控制流程、综合结论" : "Defines the question, controls the process, and synthesizes.", "host"),
          role("strategy", isZh ? "战略顾问" : "Strategy Advisor", isZh ? "判断方向是否值得投入" : "Judges whether the direction is worth pursuing.", "support"),
          role("risk", isZh ? "风险官" : "Risk Officer", isZh ? "识别失败代价、不可逆风险和盲区" : "Identifies downside, irreversible risks, and blind spots.", "risk"),
          role("execution", isZh ? "执行顾问" : "Execution Advisor", isZh ? "把建议拆成可执行计划" : "Turns recommendations into concrete next steps.", "executor"),
          role("stakeholder", isZh ? "用户代表" : "Stakeholder Representative", isZh ? "站在真实利益相关者角度反问" : "Represents the real people affected by the decision.", "creative"),
          role("dissent", isZh ? "反方审查员" : "Dissent Reviewer", isZh ? "必须提出少数派意见和反证" : "Must produce dissent, counter-evidence, and minority views.", "skeptic"),
        ];

  return roleSet.map((item) => ({
    ...item,
    prompt: buildRolePrompt(item.name, item.duty, topic, mode, language),
    modelConnectionId,
    participatesInVote: item.tone !== "host" && item.tone !== "creative",
  }));
}

export function createEmptySession(
  mode: AppMode,
  topic: string,
  context: string,
  depth: DepthPreset,
  roles: CouncilRole[]
): CouncilSession {
  const now = new Date().toISOString();
  return {
    id: createId("session"),
    mode,
    topic,
    context,
    depth,
    roles,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createFailedMessage(
  role: CouncilRole,
  stage: CouncilMessage["stage"],
  content: string
): CouncilMessage {
  return {
    id: createId("msg"),
    roleId: role.id,
    roleName: role.name,
    stage,
    content,
    failed: true,
    createdAt: new Date().toISOString(),
  };
}

export function createMessage(
  role: CouncilRole,
  stage: CouncilMessage["stage"],
  content: string
): CouncilMessage {
  return {
    id: createId("msg"),
    roleId: role.id,
    roleName: role.name,
    stage,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function composeResult(
  session: CouncilSession,
  language: Language
): CouncilResult {
  const isZh = language === "zh";
  const score = calculateSupportScore(session);
  const title = isZh
    ? session.mode === "arena"
      ? "AI 吵架场结论"
      : "AI 智囊室决策备忘录"
    : session.mode === "arena"
      ? "AI Debate Verdict"
      : "AI Council Decision Memo";
  const summary = latestMessage(session, ["host"], "summary") ?? latestMessage(session, ["host"]);
  const support = latestMessage(session, ["support", "strategy"]);
  const objection = latestMessage(session, ["skeptic", "risk"]);
  const risk = latestMessage(session, ["risk", "skeptic"]);
  const action = latestMessage(session, ["executor", "host"], "summary") ?? latestMessage(session, ["executor"]);
  const creative = latestMessage(session, ["creative", "skeptic"]);

  return {
    title,
    supportScore: score,
    verdict: usefulSentence(
      summary?.content,
      isZh
        ? `围绕「${session.topic}」，当前更适合先做小规模验证，而不是直接押上全部资源。`
        : `For "${session.topic}", the safer conclusion is to run a small validation before committing major resources.`
    ),
    strongestSupport: usefulSentence(
      support?.content,
      isZh
        ? "支持方的最强理由是：机会窗口可能真实存在，拖延会让学习速度变慢。"
        : "The strongest supportive argument: the opportunity window may be real, and delay slows learning."
    ),
    strongestObjection: usefulSentence(
      objection?.content,
      isZh
        ? "反方的最强理由是：关键事实不足时，信心很容易被情绪和想象放大。"
        : "The strongest objection: when key facts are missing, confidence can be inflated by emotion and imagination."
    ),
    sharpestQuote: usefulSentence(
      creative?.content ?? objection?.content,
      isZh
        ? "你现在缺的不是勇气，是一个能失败得起的验证。"
        : "What you lack is not courage, but a validation you can afford to fail."
    ),
    assumptions: isZh
      ? ["目标足够重要", "资源有限", "短期内可以做低成本验证"]
      : ["The goal matters", "Resources are limited", "A low-cost validation is possible soon"],
    actions: extractSectionList(
      action?.content,
      ["行动", "Actions"],
      ["风险", "Risks"],
      isZh
        ? ["列出一个 7 天内能完成的最小验证", "写下三个失败信号", "设定继续投入的明确条件"]
        : ["Define one minimum validation that can happen within 7 days", "Write down three failure signals", "Set explicit conditions for further commitment"]
    ),
    risks: extractSectionList(
      summary?.content ?? risk?.content,
      ["风险", "Risks"],
      [],
      isZh
        ? ["把兴趣误判成需求", "低估时间和现金流压力", "被单一模型或单一立场带偏"]
        : ["Mistaking interest for demand", "Underestimating time and cash pressure", "Being biased by one model or one stance"]
    ),
    minorityOpinion: usefulSentence(
      latestMessage(session, ["skeptic"])?.content,
      isZh
        ? "少数派认为，如果机会窗口极短，可以更激进；但前提是先定义可接受损失。"
        : "The minority view: if the opportunity window is very short, a bolder move may be justified, but only with a clear acceptable-loss line."
    ),
  };
}

function role(
  id: string,
  name: string,
  duty: string,
  tone: CouncilRole["tone"]
) {
  return {
    id,
    name,
    duty,
    stance: duty,
    tone,
  };
}

function buildRolePrompt(
  name: string,
  duty: string,
  topic: string,
  mode: AppMode,
  language: Language
) {
  if (language === "zh") {
    return `你是「${name}」。你的职责是：${duty}。本场讨论主题是「${topic}」。${
      mode === "arena"
        ? "你可以犀利、有戏剧张力，但不要编造事实。"
        : "你必须克制、结构化，明确假设和风险，不替用户做最终决定。"
    }`;
  }

  return `You are "${name}". Your duty: ${duty}. The topic is "${topic}". ${
    mode === "arena"
      ? "You may be sharp and dramatic, but do not invent facts."
      : "Be restrained and structured. State assumptions and risks. Do not make the final decision for the user."
  }`;
}

function latestMessage(
  session: CouncilSession,
  tones: Array<CouncilRole["tone"] | string>,
  stage?: CouncilMessage["stage"]
) {
  const roleToneById = new Map(session.roles.map((role) => [role.id, role.tone]));
  return [...session.messages]
    .reverse()
    .find((message) => {
      if (message.failed) return false;
      if (stage && message.stage !== stage) return false;
      const tone = roleToneById.get(message.roleId);
      return tone ? tones.includes(tone) || tones.includes(message.roleId) : false;
    });
}

function usefulSentence(content: string | undefined, fallback: string) {
  const cleaned = cleanContent(content);
  if (!cleaned) return fallback;

  const candidates = cleaned
    .split(/[\n。！？.!?]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 10);

  return candidates[0] ?? cleaned.slice(0, 180);
}

function extractList(content: string | undefined, fallback: string[]) {
  const cleaned = cleanContent(content, false);
  if (!cleaned) return fallback;

  const bulletLines = cleaned
    .split(/\n+/)
    .filter((line) => /^([-*•]|\d+[.)、])\s*/.test(line.trim()))
    .map((line) => line.replace(/^[-*•\d.)、\s]+/, "").trim())
    .filter((line) => line.length >= 4);

  if (bulletLines.length >= 2) {
    return unique([...bulletLines, ...fallback]).slice(0, 3);
  }

  const clauseLines = cleaned
    .split(/[；;。.!?]+/)
    .map((line) => line.replace(/^.*?(?:建议|next move|next best move|action|行动)[:：]?\s*/i, "").trim())
    .filter((line) => line.length >= 8);

  return unique([...bulletLines, ...clauseLines, ...fallback]).slice(0, 3);
}

function extractSectionList(
  content: string | undefined,
  startMarkers: string[],
  endMarkers: string[],
  fallback: string[]
) {
  const cleaned = cleanContent(content, false);
  if (!cleaned) return fallback;

  const lines = cleaned.split("\n");
  const startIndex = lines.findIndex((line) => hasMarker(line, startMarkers));
  if (startIndex < 0) {
    return extractList(cleaned, fallback);
  }

  const relativeEndIndex = lines
    .slice(startIndex + 1)
    .findIndex((line) => hasMarker(line, endMarkers));
  const endIndex = relativeEndIndex < 0 ? lines.length : startIndex + 1 + relativeEndIndex;
  const section = lines.slice(startIndex + 1, endIndex).join("\n");
  return extractList(section, fallback);
}

function hasMarker(line: string, markers: string[]) {
  const normalized = line.toLowerCase().replace(/[:：]/g, "").trim();
  return markers.some((marker) => normalized === marker.toLowerCase());
}

function cleanContent(content: string | undefined, collapseWhitespace = true) {
  const cleaned = (content ?? "")
    .replace(/^【[^】]+】\s*/g, "")
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/^(主持人总结|Host summary)[:：]\s*/i, "")
    .replace(/^[^：:\n]{1,40}[：:]\s*/, "")
    .trim();

  if (collapseWhitespace) {
    return cleaned.replace(/\s+/g, " ");
  }

  return cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function unique(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateSupportScore(session: CouncilSession) {
  const base = session.mode === "arena" ? 58 : 64;
  const failedCount = session.messages.filter((message) => message.failed).length;
  const score = base - failedCount * 4;
  return Math.max(35, Math.min(82, score));
}
