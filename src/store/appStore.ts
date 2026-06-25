import { create } from "zustand";
import type {
  AppMode,
  AppView,
  CouncilRole,
  CouncilSession,
  DepthPreset,
  FallbackPolicy,
  Language,
  ModelConnection,
  SharePrivacyOptions,
} from "../types";
import { detectLanguage, persistLanguage } from "../i18n";
import { depthLimits, depthStages } from "../lib/depth";
import {
  clearAllLocalData,
  clearSessions,
  deleteSession,
  loadSessions,
  loadSettings,
  saveSession,
  saveSettings,
} from "../lib/storage";
import {
  composeResult,
  createEmptySession,
  createFailedMessage,
  createMessage,
  createMockConnection,
  generateRoles,
} from "../lib/council";
import { askModel, testModelConnection } from "../providers";
import { createId } from "../lib/id";

type AppState = {
  language: Language;
  view: AppView;
  mode: AppMode;
  topic: string;
  context: string;
  depth: DepthPreset;
  roles: CouncilRole[];
  connections: ModelConnection[];
  currentSession?: CouncilSession;
  sessions: CouncilSession[];
  isRunning: boolean;
  stopRequested: boolean;
  notice?: string;
  fallbackPolicy: FallbackPolicy;
  sharePrivacy: SharePrivacyOptions;
  hydrate: () => Promise<void>;
  setNotice: (notice?: string) => void;
  setLanguage: (language: Language) => void;
  setFallbackPolicy: (policy: FallbackPolicy) => void;
  navigate: (view: AppView) => void;
  startMode: (mode: AppMode, topic?: string) => void;
  setBrief: (brief: Partial<Pick<AppState, "topic" | "context" | "depth">>) => void;
  buildLineup: () => void;
  regenerateRoles: () => void;
  autoAssignRoles: () => void;
  updateRole: (id: string, patch: Partial<CouncilRole>) => void;
  runSession: () => Promise<void>;
  stopSession: () => void;
  viewResult: (session: CouncilSession) => void;
  setSharePrivacy: (patch: Partial<SharePrivacyOptions>) => void;
  saveConnection: (connection: ModelConnection) => Promise<void>;
  testConnection: (connectionId: string) => Promise<void>;
  addBlankConnection: () => void;
  deleteConnection: (connectionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearLocalHistory: () => Promise<void>;
  clearAllLocalData: () => Promise<void>;
};

const mockConnection = createMockConnection();

export const useAppStore = create<AppState>((set, get) => ({
  language: detectLanguage(),
  view: "home",
  mode: "arena",
  topic: "",
  context: "",
  depth: "standard",
  roles: [],
  connections: [mockConnection],
  sessions: [],
  isRunning: false,
  stopRequested: false,
  fallbackPolicy: "balanced",
  sharePrivacy: {
    hideQuestion: false,
    hideBackground: false,
    conclusionOnly: false,
    redactSensitive: true,
  },

  hydrate: async () => {
    const [settings, sessions] = await Promise.all([loadSettings(), loadSessions()]);
    const language = settings?.language ?? detectLanguage();
    persistLanguage(language);
    set({
      language,
      sessions,
      connections: mergeMockConnection(settings?.connections ?? []),
      fallbackPolicy: settings?.fallbackPolicy ?? "balanced",
    });
  },

  setNotice: (notice) => set({ notice }),

  setLanguage: (language) => {
    persistLanguage(language);
    set({ language });
    void persistCurrentSettings();
  },

  setFallbackPolicy: (fallbackPolicy) => {
    set({ fallbackPolicy });
    void persistCurrentSettings();
  },

  navigate: (view) => {
    window.location.hash = view === "home" ? "" : view;
    set({ view });
  },

  startMode: (mode, topic = "") => {
    set({
      mode,
      topic,
      context: "",
      depth: mode === "arena" ? "quick" : "standard",
      roles: [],
      currentSession: undefined,
      view: "brief",
    });
    window.location.hash = "brief";
  },

  setBrief: (brief) => set(brief),

  buildLineup: () => {
    const { mode, topic, language } = get();
    const roles = generateRoles(mode, topic, language, "mock");
    set({ roles, view: "lineup" });
    window.location.hash = "lineup";
  },

  regenerateRoles: () => {
    const { mode, topic, language } = get();
    set({ roles: generateRoles(mode, topic, language, "mock") });
  },

  autoAssignRoles: () => {
    const { connections, language, roles } = get();
    const modelSeats = connections.filter((connection) => connection.protocol !== "mock");
    if (modelSeats.length === 0) {
      set({
        notice:
          language === "zh"
            ? "先添加至少一个额外模型连接，再优化阵容。"
            : "Add one more model connection before optimizing the lineup.",
      });
      return;
    }

    const optimizedRoles = roles.map((role, index) => {
      const preferredIndex =
        role.tone === "host" || role.tone === "executor"
          ? 0
          : role.tone === "skeptic" || role.tone === "risk"
            ? Math.min(1, modelSeats.length - 1)
            : Math.min(index % modelSeats.length, modelSeats.length - 1);

      return {
        ...role,
        modelConnectionId: modelSeats[preferredIndex]?.id ?? "mock",
      };
    });

    set({
      roles: optimizedRoles,
      notice: language === "zh" ? "模型席位已优化。" : "Model seats optimized.",
    });
  },

  updateRole: (id, patch) => {
    set({
      roles: get().roles.map((role) =>
        role.id === id ? { ...role, ...patch } : role
      ),
    });
  },

  runSession: async () => {
    const { mode, topic, context, depth, roles, language } = get();
    if (!topic.trim()) {
      set({ notice: language === "zh" ? "请先输入问题。" : "Add a question first." });
      return;
    }

    const nextRoles = roles.length
      ? roles
      : generateRoles(mode, topic, language, "mock");
    let session = createEmptySession(mode, topic, context, depth, nextRoles);
    set({
      currentSession: session,
      roles: nextRoles,
      view: "session",
      isRunning: true,
      stopRequested: false,
    });
    window.location.hash = "session";

    const stages = depthStages[depth].slice(0, depthLimits[depth].maxStages);
    let callCount = 0;

    for (const stage of stages) {
      if (get().stopRequested) {
        break;
      }

      if (callCount >= depthLimits[depth].maxModelCalls) {
        break;
      }

      const stageRoles =
        stage === "summary"
          ? [nextRoles.find((role) => role.tone === "host") ?? nextRoles[0]]
          : nextRoles.filter((role) => role.tone !== "host");

      for (const role of stageRoles) {
        if (get().stopRequested) {
          break;
        }

        if (callCount >= depthLimits[depth].maxModelCalls) {
          break;
        }

        const connection = findConnection(role.modelConnectionId, get().connections);

        try {
          const response = await askWithRetry({
            connection,
            role,
            mode,
            topic,
            context,
            stage,
            language,
            previousMessages: session.messages,
            maxOutputTokens: depthLimits[depth].maxOutputTokens,
          }, get().fallbackPolicy === "fast" ? 0 : 1);
          session = appendMessage(session, createMessage(role, stage, response.content));
        } catch (error) {
          session = await handleModelFailure(session, role, stage, error);
        }

        callCount += 1;
        set({ currentSession: session });
      }
    }

    session = {
      ...session,
      result: composeResult(session, language),
      updatedAt: new Date().toISOString(),
    };
    await saveSession(session);
    const sessions = await loadSessions();
    set({
      currentSession: session,
      sessions,
      isRunning: false,
      stopRequested: false,
      view: "result",
    });
    window.location.hash = "result";
  },

  stopSession: () => {
    const language = get().language;
    set({
      stopRequested: true,
      isRunning: false,
      notice:
        language === "zh"
          ? "会在当前模型调用结束后停止。"
          : "Stopping after the current model call.",
    });
  },

  viewResult: (session) => {
    set({ currentSession: session, mode: session.mode, view: "result" });
    window.location.hash = "result";
  },

  setSharePrivacy: (patch) =>
    set({ sharePrivacy: { ...get().sharePrivacy, ...patch } }),

  saveConnection: async (connection) => {
    const connections = upsertConnection(get().connections, connection);
    set({ connections });
    await persistCurrentSettings(connections, get().language);
  },

  testConnection: async (connectionId) => {
    const connection = get().connections.find((item) => item.id === connectionId);
    if (!connection) {
      return;
    }

    const result = await testModelConnection(connection);
    const connections = get().connections.map((item) =>
      item.id === connectionId
        ? {
            ...item,
            status: result.status,
            statusMessage: result.message,
          }
        : item
    );
    set({ connections, notice: result.message });
    await persistCurrentSettings(connections, get().language);
  },

  addBlankConnection: () => {
    const connection: ModelConnection = {
      id: createId("connection"),
      name: "OpenAI Compatible",
      protocol: "openai-chat-completions",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      secretStorage: "session",
      status: "untested",
    };
    set({ connections: [...get().connections, connection], view: "connections" });
    window.location.hash = "connections";
  },

  deleteConnection: async (connectionId) => {
    if (connectionId === "mock") {
      return;
    }

    const connections = get().connections.filter((item) => item.id !== connectionId);
    const roles = get().roles.map((role) =>
      role.modelConnectionId === connectionId
        ? { ...role, modelConnectionId: "mock" }
        : role
    );
    set({ connections, roles });
    await persistCurrentSettings(connections, get().language);
  },

  deleteSession: async (sessionId) => {
    await deleteSession(sessionId);
    const sessions = await loadSessions();
    const currentSession =
      get().currentSession?.id === sessionId ? undefined : get().currentSession;
    set({ sessions, currentSession });
  },

  clearLocalHistory: async () => {
    await clearSessions();
    set({ sessions: [] });
  },

  clearAllLocalData: async () => {
    const language = get().language;
    await clearAllLocalData();
    set({
      language: detectLanguage(),
      view: "home",
      mode: "arena",
      topic: "",
      context: "",
      depth: "standard",
      roles: [],
      connections: [mockConnection],
      currentSession: undefined,
      sessions: [],
      fallbackPolicy: "balanced",
      notice: language === "zh" ? "所有本地数据已清空。" : "All local data was cleared.",
    });
    window.location.hash = "";
  },
}));

function mergeMockConnection(connections: ModelConnection[]) {
  return [mockConnection, ...connections.filter((item) => item.protocol !== "mock")];
}

function upsertConnection(connections: ModelConnection[], connection: ModelConnection) {
  if (connection.protocol === "mock") {
    return connections;
  }

  const exists = connections.some((item) => item.id === connection.id);
  if (exists) {
    return connections.map((item) => (item.id === connection.id ? connection : item));
  }

  return [...connections, connection];
}

function findConnection(connectionId: string, connections: ModelConnection[]) {
  return (
    connections.find((connection) => connection.id === connectionId) ??
    connections[0] ??
    mockConnection
  );
}

function appendMessage(session: CouncilSession, message: CouncilSession["messages"][number]) {
  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date().toISOString(),
  };
}

async function handleModelFailure(
  session: CouncilSession,
  role: CouncilRole,
  stage: CouncilSession["messages"][number]["stage"],
  error: unknown
) {
  const { fallbackPolicy, language } = useAppStore.getState();
  const message =
    error instanceof Error ? error.message : language === "zh" ? "模型调用失败。" : "Model call failed.";

  if (fallbackPolicy === "conservative") {
    useAppStore.setState({
      stopRequested: true,
      notice:
        language === "zh"
          ? "模型调用失败，已按保守策略停止后续角色。"
          : "A model call failed, so the conservative policy stopped later roles.",
    });
    return appendMessage(
      session,
      createFailedMessage(role, stage, language === "zh" ? `已暂停：${message}` : `Paused: ${message}`)
    );
  }

  if (fallbackPolicy === "balanced") {
    try {
      const response = await askModel({
        connection: mockConnection,
        role,
        mode: session.mode,
        topic: session.topic,
        context: session.context,
        stage,
        language,
        previousMessages: session.messages,
        maxOutputTokens: 420,
      });
      return appendMessage(
        session,
        createMessage(
          role,
          stage,
          language === "zh"
            ? `${response.content}\n\n（原模型失败，已由 Mock Provider 代打。）`
            : `${response.content}\n\n(The assigned model failed, so Mock Provider substituted.)`
        )
      );
    } catch {
      // Fall through to failed message.
    }
  }

  return appendMessage(
    session,
    createFailedMessage(
      role,
      stage,
      language === "zh" ? `该角色已跳过：${message}` : `Role skipped: ${message}`
    )
  );
}

async function askWithRetry(
  request: Parameters<typeof askModel>[0],
  retries: number
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await askModel(request);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function persistCurrentSettings(
  connections = useAppStore.getState().connections,
  language = useAppStore.getState().language
) {
  await saveSettings({
    id: "settings",
    language,
    connections,
    fallbackPolicy: useAppStore.getState().fallbackPolicy,
  });
}
