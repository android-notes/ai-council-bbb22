import type { CouncilSession, SharePrivacyOptions } from "../types";
import { redactSensitiveText } from "./redact";

export function sessionToMarkdown(
  session: CouncilSession,
  privacy: SharePrivacyOptions,
  language: "en" | "zh" = hasChinese(session.result?.title ?? session.topic) ? "zh" : "en"
) {
  const result = session.result;
  if (!result) {
    return "";
  }

  const label = labels[language];
  const topic = privacy.hideQuestion ? label.hiddenQuestion : session.topic;
  const context = privacy.hideBackground ? "" : session.context;
  const clean = (value: string) =>
    privacy.redactSensitive ? redactSensitiveText(value) : value;

  const lines = [
    `# ${clean(result.title)}`,
    "",
    `**${label.question}:** ${clean(topic)}`,
  ];

  if (context && !privacy.conclusionOnly) {
    lines.push("", `**${label.context}:** ${clean(context)}`);
  }

  lines.push(
    "",
    `## ${label.verdict}`,
    clean(result.verdict),
    "",
    `## ${label.support}`,
    clean(result.strongestSupport),
    "",
    `## ${label.objection}`,
    clean(result.strongestObjection)
  );

  if (!privacy.conclusionOnly) {
    lines.push(
      "",
      `## ${label.risks}`,
      ...result.risks.map((risk) => `- ${clean(risk)}`),
      "",
      `## ${label.actions}`,
      ...result.actions.map((action) => `- ${clean(action)}`),
      "",
      `## ${label.minority}`,
      clean(result.minorityOpinion)
    );
  }

  return lines.join("\n");
}

const labels = {
  en: {
    question: "Question",
    hiddenQuestion: "Hidden question",
    context: "Context",
    verdict: "Verdict",
    support: "Strongest Support",
    objection: "Strongest Objection",
    risks: "Risks",
    actions: "Actions",
    minority: "Minority Opinion",
  },
  zh: {
    question: "问题",
    hiddenQuestion: "已隐藏的问题",
    context: "背景",
    verdict: "结论",
    support: "最强支持理由",
    objection: "最强反对理由",
    risks: "风险",
    actions: "行动",
    minority: "少数派意见",
  },
};

function hasChinese(value: string) {
  return /[\u4e00-\u9fff]/.test(value);
}
