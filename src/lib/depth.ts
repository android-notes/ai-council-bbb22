import type { DepthPreset, SessionLimits, SessionStage } from "../types";

export const depthStages: Record<DepthPreset, SessionStage[]> = {
  quick: ["opening", "summary"],
  standard: ["opening", "rebuttal", "revision", "summary"],
  deep: ["opening", "crossExam", "revision", "riskReview", "vote", "summary"],
};

export const depthLimits: Record<DepthPreset, SessionLimits> = {
  quick: {
    maxStages: 2,
    maxModelCalls: 6,
    maxTurnsPerRole: 1,
    maxOutputTokens: 320,
    costLevel: "low",
  },
  standard: {
    maxStages: 4,
    maxModelCalls: 18,
    maxTurnsPerRole: 3,
    maxOutputTokens: 520,
    costLevel: "medium",
  },
  deep: {
    maxStages: 6,
    maxModelCalls: 36,
    maxTurnsPerRole: 5,
    maxOutputTokens: 760,
    costLevel: "high",
  },
};

export function estimateCalls(roleCount: number, depth: DepthPreset) {
  const stages = depthStages[depth];
  return Math.min(roleCount * Math.max(stages.length - 1, 1) + 1, depthLimits[depth].maxModelCalls);
}
