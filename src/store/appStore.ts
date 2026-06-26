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
  generateRoles,
} from "../lib/council";
import { askModel, fetchModelList, testModelConnection } from "../providers";
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
  apiKeyModalOpen: boolean;
  fallbackPolicy: FallbackPolicy;
  sharePrivacy: SharePrivacyOptions;
  hydrate: () => Promise<void>;
  setNotice: (notice?: string) => void;
  openApiKeyModal: () => void;
  closeApiKeyModal: () => void;
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
  fetchModels: (connection: ModelConnection) => Promise<ModelConnection | undefined>;
  addBlankConnection: () => void;
  deleteConnection: (connectionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearLocalHistory: () => Promise<void>;
  clearAllLocalData: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  language: detectLanguage(),
  view: "home",
  mode: "review",
  topic: "",
  context: "",
  depth: "standard",
  roles: [],
  connections: [],
  sessions: [],
  isRunning: false,
  stopRequested: false,
  apiKeyModalOpen: false,
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
    const latestResult =
      window.location.hash.replace("#", "") === "result"
        ? sessions.find((session) => Boolean(session.result))
        : undefined;
    persistLanguage(language);
    set({
      language,
      sessions,
      connections: settings?.connections ?? [],
      fallbackPolicy: settings?.fallbackPolicy ?? "balanced",
      ...(latestResult
        ? {
            currentSession: latestResult,
            mode: latestResult.mode,
            topic: latestResult.topic,
            context: latestResult.context,
            depth: latestResult.depth,
            roles: latestResult.roles,
          }
        : {}),
    });
  },

  setNotice: (notice) => set({ notice }),
  openApiKeyModal: () => set({ apiKeyModalOpen: true }),
  closeApiKeyModal: () => set({ apiKeyModalOpen: false }),

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
    if (!hasUsableModelSeat(get().connections)) {
      set({
        mode,
        topic,
        context: "",
        depth: mode === "review" ? "quick" : "standard",
        roles: [],
        currentSession: undefined,
        apiKeyModalOpen: true,
        notice: keyRequiredMessage(get().language),
      });
      return;
    }

    set({
      mode,
      topic,
      context: "",
      depth: mode === "review" ? "quick" : "standard",
      roles: [],
      currentSession: undefined,
      view: "brief",
    });
    window.location.hash = "brief";
  },

  setBrief: (brief) => set(brief),

  buildLineup: () => {
    const { mode, topic, language, connections } = get();
    const defaultConnectionId = pickDefaultModelConnectionId(connections);
    if (!defaultConnectionId) {
      set({
        apiKeyModalOpen: true,
        notice: keyRequiredMessage(language),
      });
      return;
    }

    const roles = generateRoles(
      mode,
      topic,
      language,
      defaultConnectionId
    );
    set({ roles, view: "lineup" });
    window.location.hash = "lineup";
  },

  regenerateRoles: () => {
    const { mode, topic, language, connections } = get();
    const defaultConnectionId = pickDefaultModelConnectionId(connections);
    if (!defaultConnectionId) {
      set({
        apiKeyModalOpen: true,
        notice: keyRequiredMessage(language),
      });
      return;
    }

    set({
      roles: generateRoles(
        mode,
        topic,
        language,
        defaultConnectionId
      ),
    });
  },

  autoAssignRoles: () => {
    const { connections, language, roles } = get();
    const modelSeats = usableModelSeats(connections);
    if (modelSeats.length === 0) {
      set({
        notice:
          language === "zh"
            ? "请先添加一个带 API Key 的模型连接。"
            : "Add a model connection with an API key first.",
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
        modelConnectionId: modelSeats[preferredIndex]?.id ?? "",
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

    const defaultConnectionId = pickDefaultModelConnectionId(get().connections);
    if (!defaultConnectionId) {
      set({
        apiKeyModalOpen: true,
        notice: keyRequiredMessage(language),
      });
      return;
    }

    const nextRoles = roles.length
      ? roles
      : generateRoles(
          mode,
          topic,
          language,
          defaultConnectionId
        );
    if (!rolesHaveUsableSeats(nextRoles, get().connections)) {
      set({
        apiKeyModalOpen: true,
        notice: keyRequiredMessage(language),
      });
      return;
    }

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
    if (!hasCallableConfiguration(connection)) {
      set({
        apiKeyModalOpen: true,
        notice: keyRequiredMessage(get().language),
      });
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

  fetchModels: async (connection) => {
    if (!hasCallableConfiguration(connection)) {
      set({
        apiKeyModalOpen: true,
        notice: keyRequiredMessage(get().language),
      });
      return undefined;
    }

    const result = await fetchModelList(connection);
    if (!result.ok) {
      const failedConnection = {
        ...connection,
        status: "failed" as const,
        statusMessage: result.message,
      };
      const connections = upsertConnection(get().connections, failedConnection);
      set({ connections, notice: result.message });
      await persistCurrentSettings(connections, get().language);
      return undefined;
    }

    const nextConnection = {
      ...connection,
      availableModels: result.models,
      model: result.models.includes(connection.model)
        ? connection.model
        : result.models[0] ?? connection.model,
      status: "connected" as const,
      statusMessage: result.message,
    };
    const connections = upsertConnection(get().connections, nextConnection);
    set({ connections, notice: result.message });
    await persistCurrentSettings(connections, get().language);
    return nextConnection;
  },

  addBlankConnection: () => {
    const connection: ModelConnection = {
      id: createId("connection"),
      name: "OpenAI Compatible",
      protocol: "openai-chat-completions",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      availableModels: [],
      secretStorage: "session",
      status: "untested",
    };
    set({ connections: [...get().connections, connection], view: "connections" });
    window.location.hash = "connections";
  },

  deleteConnection: async (connectionId) => {
    const connections = get().connections.filter((item) => item.id !== connectionId);
    const fallbackConnectionId = pickDefaultModelConnectionId(connections) ?? "";
    const roles = get().roles.map((role) =>
      role.modelConnectionId === connectionId
        ? { ...role, modelConnectionId: fallbackConnectionId }
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
      mode: "review",
      topic: "",
      context: "",
      depth: "standard",
      roles: [],
      connections: [],
      currentSession: undefined,
      sessions: [],
      fallbackPolicy: "balanced",
      apiKeyModalOpen: false,
      notice: language === "zh" ? "所有本地数据已清空。" : "All local data was cleared.",
    });
    window.location.hash = "";
  },
}));

function upsertConnection(connections: ModelConnection[], connection: ModelConnection) {
  const exists = connections.some((item) => item.id === connection.id);
  if (exists) {
    return connections.map((item) => (item.id === connection.id ? connection : item));
  }

  return [...connections, connection];
}

function findConnection(connectionId: string, connections: ModelConnection[]) {
  const connection = connections.find((item) => item.id === connectionId);
  if (!connection) {
    throw new Error("Model connection is missing. Configure an API key before starting.");
  }
  return connection;
}

function pickDefaultModelConnectionId(connections: ModelConnection[]) {
  return usableModelSeats(connections)[0]?.id;
}

function usableModelSeats(connections: ModelConnection[]) {
  const configuredSeats = connections.filter(hasCallableConfiguration);
  const connectedSeats = configuredSeats.filter((connection) => connection.status === "connected");

  return [...connectedSeats, ...configuredSeats].filter(
    (connection, index, seats) =>
      seats.findIndex((seat) => seat.id === connection.id) === index &&
      !isUnconfiguredDefaultConnection(connection)
  );
}

function hasCallableConfiguration(connection: ModelConnection) {
  return Boolean(connection.apiKey?.trim());
}

function hasUsableModelSeat(connections: ModelConnection[]) {
  return usableModelSeats(connections).length > 0;
}

function rolesHaveUsableSeats(roles: CouncilRole[], connections: ModelConnection[]) {
  const usableIds = new Set(usableModelSeats(connections).map((connection) => connection.id));
  return roles.length > 0 && roles.every((role) => usableIds.has(role.modelConnectionId));
}

function keyRequiredMessage(language: Language) {
  return language === "zh"
    ? "请先配置模型 API Key 以继续。"
    : "Configure a model API key to continue.";
}

function isUnconfiguredDefaultConnection(connection: ModelConnection) {
  return (
    !connection.apiKey?.trim() &&
    !connection.customHeaders &&
    connection.status !== "connected" &&
    (trimSlashes(connection.baseUrl) === "https://api.openai.com/v1" ||
      isPlaceholderEndpoint(connection.baseUrl))
  );
}

function isPlaceholderEndpoint(baseUrl: string) {
  return baseUrl.includes("your-") || baseUrl.includes("example.com");
}

function trimSlashes(value: string) {
  return value.trim().replace(/\/+$/, "");
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
