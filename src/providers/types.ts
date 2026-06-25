import type {
  AppMode,
  CouncilMessage,
  CouncilRole,
  Language,
  ModelConnection,
  SessionStage,
} from "../types";

export type ModelRequest = {
  connection: ModelConnection;
  role: CouncilRole;
  mode: AppMode;
  topic: string;
  context: string;
  stage: SessionStage;
  language: Language;
  previousMessages: CouncilMessage[];
  maxOutputTokens: number;
};

export type ModelResponse = {
  content: string;
  raw?: unknown;
};

export type ConnectionTestResult = {
  ok: boolean;
  status: "connected" | "failed";
  message: string;
  latencyMs?: number;
};
