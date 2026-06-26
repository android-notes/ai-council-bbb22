export type Language = "en" | "zh";

export type AppMode = "arena" | "council";

export type AppView =
  | "home"
  | "brief"
  | "lineup"
  | "session"
  | "result"
  | "connections"
  | "history";

export type DepthPreset = "quick" | "standard" | "deep";

export type SessionStage =
  | "opening"
  | "rebuttal"
  | "revision"
  | "crossExam"
  | "riskReview"
  | "vote"
  | "summary";

export type ModelProtocol =
  | "openai-chat-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "gemini"
  | "ollama"
  | "custom";

export type SecretStorage = "session" | "local";

export type FallbackPolicy = "conservative" | "balanced" | "fast";

export type ModelConnection = {
  id: string;
  name: string;
  protocol: ModelProtocol;
  baseUrl: string;
  apiKey?: string;
  model: string;
  availableModels?: string[];
  customHeaders?: Record<string, string>;
  secretStorage: SecretStorage;
  status: "untested" | "connected" | "failed";
  statusMessage?: string;
};

export type CouncilRole = {
  id: string;
  name: string;
  stance: string;
  duty: string;
  prompt: string;
  tone: "host" | "support" | "skeptic" | "risk" | "creative" | "executor";
  modelConnectionId: string;
  participatesInVote: boolean;
};

export type CouncilMessage = {
  id: string;
  roleId: string;
  roleName: string;
  stage: SessionStage;
  content: string;
  createdAt: string;
  failed?: boolean;
};

export type CouncilResult = {
  title: string;
  verdict: string;
  supportScore: number;
  strongestSupport: string;
  strongestObjection: string;
  sharpestQuote: string;
  assumptions: string[];
  actions: string[];
  risks: string[];
  minorityOpinion: string;
};

export type CouncilSession = {
  id: string;
  mode: AppMode;
  topic: string;
  context: string;
  depth: DepthPreset;
  roles: CouncilRole[];
  messages: CouncilMessage[];
  result?: CouncilResult;
  createdAt: string;
  updatedAt: string;
};

export type SessionLimits = {
  maxStages: number;
  maxModelCalls: number;
  maxTurnsPerRole: number;
  maxOutputTokens: number;
  costLevel: "low" | "medium" | "high";
};

export type SharePrivacyOptions = {
  hideQuestion: boolean;
  hideBackground: boolean;
  conclusionOnly: boolean;
  redactSensitive: boolean;
};
