import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Download,
  FileJson,
  History,
  Languages,
  MessageSquareText,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toPng } from "html-to-image";
import clsx from "clsx";
import { createTranslator, nextLanguage } from "./i18n";
import { depthLimits, estimateCalls } from "./lib/depth";
import { sessionToMarkdown } from "./lib/markdown";
import { createId } from "./lib/id";
import { useAppStore } from "./store/appStore";
import type {
  AppMode,
  AppView,
  DepthPreset,
  FallbackPolicy,
  ModelConnection,
  ModelProtocol,
  SessionStage,
} from "./types";

type ConnectionAction = "fetch" | "test" | "save";
type ActionFeedback = {
  tone: "neutral" | "success" | "error";
  message: string;
};

const CONNECTION_ACTION_TIMEOUT_MS = 10_000;

const suggestedQuestions = {
  en: [
    "Should we launch this product as open source?",
    "Which market should we enter first?",
    "Should I accept this job offer?",
    "How should we reduce churn this quarter?",
  ],
  zh: [
    "这个产品是否应该开源发布？",
    "我们应该优先进入哪个市场？",
    "我要不要接受这个工作机会？",
    "这个季度应该如何降低流失？",
  ],
};

const supportedViews: AppView[] = [
  "home",
  "brief",
  "lineup",
  "session",
  "result",
  "connections",
  "history",
];

export function App() {
  const hydrate = useAppStore((state) => state.hydrate);
  const view = useAppStore((state) => state.view);
  const language = useAppStore((state) => state.language);
  const notice = useAppStore((state) => state.notice);
  const apiKeyModalOpen = useAppStore((state) => state.apiKeyModalOpen);
  const t = useMemo(() => createTranslator(language), [language]);

  useEffect(() => {
    void hydrate();
    const syncRoute = () => {
      const hash = window.location.hash.replace("#", "") as AppView;
      useAppStore.setState({
        view: supportedViews.includes(hash) ? hash : "home",
      });
    };
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, [hydrate]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      useAppStore.getState().setNotice(undefined);
    }, 3600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className="app-shell min-h-screen">
      <div className="app-frame mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Header />
        {notice ? <div className="notice-bar">{notice}</div> : null}
        <main className="flex-1 py-5">
          {view === "home" && <HomeView />}
          {view === "brief" && <BriefView />}
          {view === "lineup" && <LineupView />}
          {view === "session" && <SessionView />}
          {view === "result" && <ResultView />}
          {view === "connections" && <ConnectionsView />}
          {view === "history" && <HistoryView />}
        </main>
        {apiKeyModalOpen ? <ApiKeyModal /> : null}
        <footer className="app-footer flex flex-col gap-2 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>AI Council</span>
          <span>{t("common.localOnly")}</span>
        </footer>
      </div>
    </div>
  );
}

function Header() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const navigate = useAppStore((state) => state.navigate);
  const view = useAppStore((state) => state.view);
  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <header className="app-header flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <button className="brand-lockup flex w-fit items-center gap-3 text-left" onClick={() => navigate("home")}>
        <span className="brand-mark">
          <Bot size={24} />
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight">AI Council</span>
          <span className="block max-w-xl text-sm text-stone-500">{t("app.subtitle")}</span>
        </span>
      </button>
      <nav className="flex flex-wrap items-center gap-2">
        <NavButton active={view === "home"} onClick={() => navigate("home")} icon={<MessageSquareText size={16} />}>
          {t("nav.home")}
        </NavButton>
        <NavButton active={view === "connections"} onClick={() => navigate("connections")} icon={<Settings size={16} />}>
          {t("nav.connections")}
        </NavButton>
        <NavButton active={view === "history"} onClick={() => navigate("history")} icon={<History size={16} />}>
          {t("nav.history")}
        </NavButton>
        <button
          className="icon-text-button"
          onClick={() => setLanguage(nextLanguage(language))}
          title={t("common.language")}
        >
          <Languages size={16} />
          <span>{language === "zh" ? "中文" : "EN"}</span>
        </button>
      </nav>
    </header>
  );
}

function HomeView() {
  const language = useAppStore((state) => state.language);
  const connections = useAppStore((state) => state.connections);
  const startMode = useAppStore((state) => state.startMode);
  const setNotice = useAppStore((state) => state.setNotice);
  const navigate = useAppStore((state) => state.navigate);
  const t = useMemo(() => createTranslator(language), [language]);
  const [question, setQuestion] = useState("");
  const [selectedMode, setSelectedMode] = useState<AppMode>("review");
  const configuredCount = connections.filter(hasApiKeyForUi).length;

  function begin(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) {
      setNotice(language === "zh" ? "请先输入要解决的问题。" : "Enter the question you want the council to solve.");
      return;
    }

    startMode(selectedMode, trimmed);
  }

  return (
    <section className="home-screen">
      <div className="home-hero">
        <div className="section-kicker">
          <ShieldCheck size={16} />
          <span>{language === "zh" ? "本地优先 · 自带模型 Key" : "Local-first · Bring your own model key"}</span>
        </div>
        <h1 className="hero-title">
          {language === "zh" ? "你的问题，AI开会解决。" : "Your question. AI convenes."}
        </h1>
        <p className="hero-copy">
          {language === "zh"
            ? "把一个重要问题交给多位 AI 角色审阅。系统会组织观点、质疑假设、归纳风险，并输出可执行的会议纪要。"
            : "Give one important question to a council of AI roles. The app structures perspectives, challenges assumptions, reviews risk, and returns an actionable memo."}
        </p>

        <div className="question-console">
          <label className="field-label">
            <span>{t("brief.topic")}</span>
            <textarea
              className="question-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={
                language === "zh"
                  ? "例如：这个产品是否应该先做开源版本？"
                  : "Example: Should we release this product as open source first?"
              }
            />
          </label>
          <div className="mode-switch" aria-label={language === "zh" ? "会议模式" : "Meeting mode"}>
            {(["review", "council"] as AppMode[]).map((mode) => (
              <button
                className={clsx(selectedMode === mode && "selected")}
                key={mode}
                onClick={() => setSelectedMode(mode)}
              >
                <span>{mode === "review" ? t("home.review.title") : t("home.council.title")}</span>
                <small>{mode === "review" ? t("home.review.body") : t("home.council.body")}</small>
              </button>
            ))}
          </div>
          <button className="primary-button justify-center" onClick={() => begin()}>
            <Play size={16} />
            <span>{t("home.start")}</span>
          </button>
        </div>
      </div>

      <aside className="home-side-panel">
        <div className="readiness-card">
          <p className="connection-eyebrow">{language === "zh" ? "模型连接" : "Model access"}</p>
          <h2>{configuredCount > 0 ? (language === "zh" ? "已就绪" : "Ready") : t("connections.requiredTitle")}</h2>
          <p>
            {configuredCount > 0
              ? language === "zh"
                ? `已配置 ${configuredCount} 个可用模型连接。`
                : `${configuredCount} model connection${configuredCount > 1 ? "s" : ""} configured.`
              : language === "zh"
                ? "首次运行会在需要时弹出配置窗口。Key 只保存在当前浏览器。"
                : "Setup appears only when needed. Keys stay in this browser."}
          </p>
          <button className="secondary-button" onClick={() => navigate("connections")}>
            <Settings size={16} />
            <span>{configuredCount > 0 ? t("nav.connections") : t("connections.add")}</span>
          </button>
        </div>

        <details className="suggestion-drawer">
          <summary>
            <span>{t("home.tryPreset")}</span>
            <ChevronRight size={16} />
          </summary>
          <div className="suggestion-list">
          {suggestedQuestions[language].map((topic) => (
            <button
              key={topic}
              className="suggestion-row"
              onClick={() => {
                setQuestion(topic);
                begin(topic);
              }}
            >
              <span>{topic}</span>
              <ChevronRight size={16} />
            </button>
          ))}
          </div>
        </details>
      </aside>
    </section>
  );
}

function BriefView() {
  const language = useAppStore((state) => state.language);
  const navigate = useAppStore((state) => state.navigate);
  const topic = useAppStore((state) => state.topic);
  const context = useAppStore((state) => state.context);
  const depth = useAppStore((state) => state.depth);
  const mode = useAppStore((state) => state.mode);
  const setBrief = useAppStore((state) => state.setBrief);
  const buildLineup = useAppStore((state) => state.buildLineup);
  const t = useMemo(() => createTranslator(language), [language]);
  const roleCount = mode === "review" ? 5 : 6;

  return (
    <section className="mx-auto max-w-4xl">
      <BackButton onClick={() => navigate("home")} />
      <div className="surface-panel brief-panel p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("brief.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {language === "zh"
            ? "补充必要背景即可。更细的会议参数可以保持默认，需要时再展开。"
            : "Add only the context that changes the answer. Meeting parameters can stay on their defaults until you need them."}
        </p>
        <div className="mt-5 grid gap-4">
          <label className="field-label">
            <span>{t("brief.topic")}</span>
            <input
              className="text-input"
              value={topic}
              onChange={(event) => setBrief({ topic: event.target.value })}
              placeholder={language === "zh" ? "例如：我要不要辞职做 AI 产品？" : "Example: Should I quit my job to build an AI product?"}
            />
          </label>
          <label className="field-label">
            <span>{t("brief.context")}</span>
            <textarea
              className="text-input min-h-32 resize-y"
              value={context}
              onChange={(event) => setBrief({ context: event.target.value })}
              placeholder={language === "zh" ? "补充预算、时间、限制、风险承受能力。" : "Add budget, timing, constraints, and risk tolerance."}
            />
          </label>
          <details className="progressive-panel">
            <summary>
              <span>{language === "zh" ? "会议设置" : "Meeting settings"}</span>
              <span className="summary-meta">
                {estimateCalls(roleCount, depth)} {language === "zh" ? "次调用" : "calls"} · {depthLimits[depth].costLevel}
              </span>
            </summary>
            <div className="progressive-body">
              <div>
                <span className="mb-2 block text-sm font-medium text-stone-700">{t("brief.depth")}</span>
                <div className="segmented-control">
                  {(["quick", "standard", "deep"] as DepthPreset[]).map((item) => (
                    <button
                      key={item}
                      className={clsx(depth === item && "selected")}
                      onClick={() => setBrief({ depth: item })}
                    >
                      {item === "quick" && t("brief.quick")}
                      {item === "standard" && t("brief.standard")}
                      {item === "deep" && t("brief.deep")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cost-strip flex flex-col gap-3 rounded-md p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {t("common.estimatedCalls")}: {estimateCalls(roleCount, depth)}
                </span>
                <span>
                  {t("common.cost")}: {depthLimits[depth].costLevel}
                </span>
              </div>
            </div>
          </details>
          <button className="primary-button justify-center" onClick={buildLineup}>
            <Bot size={16} />
            <span>{t("brief.build")}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function LineupView() {
  const language = useAppStore((state) => state.language);
  const mode = useAppStore((state) => state.mode);
  const depth = useAppStore((state) => state.depth);
  const roles = useAppStore((state) => state.roles);
  const connections = useAppStore((state) => state.connections);
  const updateRole = useAppStore((state) => state.updateRole);
  const regenerateRoles = useAppStore((state) => state.regenerateRoles);
  const autoAssignRoles = useAppStore((state) => state.autoAssignRoles);
  const fallbackPolicy = useAppStore((state) => state.fallbackPolicy);
  const setFallbackPolicy = useAppStore((state) => state.setFallbackPolicy);
  const runSession = useAppStore((state) => state.runSession);
  const navigate = useAppStore((state) => state.navigate);
  const t = useMemo(() => createTranslator(language), [language]);
  const diversity = calculateDiversityScore(roles);
  const usableConnections = connections.filter(hasApiKeyForUi);
  const activeSeatCount = new Set(roles.map((role) => role.modelConnectionId).filter(Boolean)).size;
  const roleCount = mode === "review" ? 5 : 6;

  return (
    <section className="lineup-screen">
      <BackButton onClick={() => navigate("brief")} />
      <div className="lineup-hero">
        <div>
          <p className="connection-eyebrow">{language === "zh" ? "会议预览" : "Meeting preview"}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("lineup.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{t("lineup.subtitle")}</p>
        </div>
        <div className="lineup-actions">
          <button className="primary-button" onClick={() => void runSession()}>
            <Play size={16} />
            <span>{t("lineup.start")}</span>
          </button>
        </div>
      </div>

      <div className="lineup-summary-grid">
        <div>
          <span>{roles.length || roleCount}</span>
          <small>{language === "zh" ? "会议角色" : "roles"}</small>
        </div>
        <div>
          <span>{activeSeatCount || 1}</span>
          <small>{language === "zh" ? "模型席位" : "model seats"}</small>
        </div>
        <div>
          <span>{estimateCalls(roles.length || roleCount, depth)}</span>
          <small>{language === "zh" ? "预计调用" : "estimated calls"}</small>
        </div>
      </div>

      <details className="progressive-panel lineup-advanced">
        <summary>
          <span>{language === "zh" ? "高级会议设置" : "Advanced meeting settings"}</span>
          <span className="summary-meta">{t("lineup.diversity")}: {diversity}/100</span>
        </summary>
        <div className="progressive-body">
          <div className="diversity-panel grid gap-3 rounded-lg p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-cyan-950">{t("lineup.diversity")}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-cyan-800">{diversity}/100</p>
            </div>
            <p className="text-sm leading-6 text-cyan-900">{t("lineup.diversityHint")}</p>
            <button className="secondary-button bg-white" onClick={() => navigate("connections")}>
              <Plus size={16} />
              <span>{t("lineup.addModel")}</span>
            </button>
          </div>
          <div className="failure-panel grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_220px] md:items-center">
            <div>
              <h2 className="text-sm font-semibold text-stone-950">{t("lineup.failurePolicy")}</h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">{t("lineup.failurePolicyHint")}</p>
            </div>
            <select
              className="text-input"
              value={fallbackPolicy}
              onChange={(event) => setFallbackPolicy(event.target.value as FallbackPolicy)}
            >
              <option value="balanced">{t("lineup.fallbackBalanced")}</option>
              <option value="conservative">{t("lineup.fallbackConservative")}</option>
              <option value="fast">{t("lineup.fallbackFast")}</option>
            </select>
          </div>
          <div className="lineup-utility-row">
            <button className="secondary-button" onClick={autoAssignRoles}>
              <Sparkles size={16} />
              <span>{t("lineup.autoAssign")}</span>
            </button>
            <button className="secondary-button" onClick={regenerateRoles}>
              <RotateCcw size={16} />
              <span>{t("lineup.regenerate")}</span>
            </button>
          </div>
        </div>
      </details>

      <div className="role-list">
        {roles.map((role, index) => (
          <RoleCard
            key={role.id}
            role={role}
            index={index}
            language={language}
            connections={connections}
            usableConnections={usableConnections}
            updateRole={updateRole}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

function RoleCard({
  role,
  index,
  language,
  connections,
  usableConnections,
  updateRole,
  t,
}: {
  role: ReturnType<typeof useAppStore.getState>["roles"][number];
  index: number;
  language: "en" | "zh";
  connections: ModelConnection[];
  usableConnections: ModelConnection[];
  updateRole: (id: string, patch: Partial<ReturnType<typeof useAppStore.getState>["roles"][number]>) => void;
  t: ReturnType<typeof createTranslator>;
}) {
  const selectedConnection = connections.find((connection) => connection.id === role.modelConnectionId);

  return (
    <article className="role-card">
      <div className="role-summary">
        <span className="role-index">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <h2>{role.name}</h2>
          <p>{role.duty}</p>
        </div>
        <span className="role-model-pill">
          {selectedConnection ? `${selectedConnection.name} / ${selectedConnection.model}` : t("lineup.model")}
        </span>
      </div>
      <label className="field-label compact">
        <span>{t("lineup.model")}</span>
        <select
          className="text-input"
          value={role.modelConnectionId}
          onChange={(event) => updateRole(role.id, { modelConnectionId: event.target.value })}
        >
          {roleConnectionOptions(usableConnections, connections, role.modelConnectionId).map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name} / {connection.model}
            </option>
          ))}
        </select>
      </label>
      <details className="advanced-role-panel">
        <summary>{language === "zh" ? "编辑角色与提示词" : "Edit role and prompt"}</summary>
        <div className="role-edit-grid">
          <label className="field-label compact">
            <span>{language === "zh" ? "角色名称" : "Role name"}</span>
            <input
              className="role-title-input"
              value={role.name}
              onChange={(event) => updateRole(role.id, { name: event.target.value })}
            />
          </label>
          <label className="field-label compact">
            <span>{language === "zh" ? "职责" : "Responsibility"}</span>
            <textarea
              className="role-duty-input"
              value={role.duty}
              onChange={(event) => updateRole(role.id, { duty: event.target.value })}
            />
          </label>
          <label className="field-label compact">
            <span>{t("lineup.prompt")}</span>
            <textarea
              className="role-prompt-input"
              value={role.prompt}
              onChange={(event) => updateRole(role.id, { prompt: event.target.value })}
            />
          </label>
        </div>
      </details>
    </article>
  );
}

function SessionView() {
  const language = useAppStore((state) => state.language);
  const session = useAppStore((state) => state.currentSession);
  const connections = useAppStore((state) => state.connections);
  const isRunning = useAppStore((state) => state.isRunning);
  const navigate = useAppStore((state) => state.navigate);
  const stopSession = useAppStore((state) => state.stopSession);
  const t = useMemo(() => createTranslator(language), [language]);
  const connectionNames = useMemo(
    () => new Map(connections.map((connection) => [connection.id, connection.name])),
    [connections]
  );

  if (!session) {
    return <EmptyState label={language === "zh" ? "还没有会议。" : "No meeting yet."} />;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="surface-panel overflow-hidden">
        <div className="meeting-header">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
              {isRunning ? t("session.running") : t("session.completed")}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{session.topic}</h1>
          </div>
          {isRunning ? (
            <button className="danger-button" onClick={stopSession}>
              <Trash2 size={16} />
              <span>{t("session.stop")}</span>
            </button>
          ) : session.result ? (
            <button className="primary-button" onClick={() => navigate("result")}>
              <span>{t("session.result")}</span>
              <ChevronRight size={16} />
            </button>
          ) : null}
        </div>
        <div className="meeting-stream">
          {session.messages.map((message) => (
            <article className={clsx("message-row", message.failed && "failed")} key={message.id}>
              <div className="message-meta">
                <span className="font-medium">{message.roleName}</span>
                <span>{formatStage(message.stage, language)}</span>
              </div>
              <p>{message.content}</p>
            </article>
          ))}
          {isRunning ? <div className="loading-line" /> : null}
        </div>
      </div>
      <aside className="surface-panel p-4">
        <h2 className="text-sm font-semibold">{language === "zh" ? "会议控制台" : "Meeting console"}</h2>
        <div className="mt-4 space-y-3">
          {session.roles.map((role) => (
            <div className="console-role-row" key={role.id}>
              <span>{role.name}</span>
              <span>{connectionNames.get(role.modelConnectionId) ?? role.modelConnectionId}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function ResultView() {
  const language = useAppStore((state) => state.language);
  const session = useAppStore((state) => state.currentSession);
  const privacy = useAppStore((state) => state.sharePrivacy);
  const setSharePrivacy = useAppStore((state) => state.setSharePrivacy);
  const navigate = useAppStore((state) => state.navigate);
  const startMode = useAppStore((state) => state.startMode);
  const setNotice = useAppStore((state) => state.setNotice);
  const t = useMemo(() => createTranslator(language), [language]);
  const exportRef = useRef<HTMLDivElement>(null);
  const [manualCopyText, setManualCopyText] = useState("");

  if (!session?.result) {
    return <EmptyState label={language === "zh" ? "还没有结果。" : "No result yet."} />;
  }

  const result = session.result;
  const markdown = sessionToMarkdown(session, privacy, language);
  const shareTitle =
    language === "zh"
      ? `AI Council 会议纪要：${session.topic}`
      : `AI Council memo: ${session.topic}`;
  const briefingSummary =
    language === "zh"
      ? `问题：${session.topic}\n结论：${result.verdict}\n关键洞察：${result.keyInsight}\n下一步：${result.actions[0] ?? "先做一次低成本验证。"}`
      : `Question: ${session.topic}\nVerdict: ${result.verdict}\nKey insight: ${result.keyInsight}\nNext step: ${result.actions[0] ?? "Run a low-cost validation first."}`;

  async function downloadImage() {
    if (!exportRef.current) return;
    try {
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        backgroundColor: "#07010d",
      });
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, "ai-council-result.png");
      setNotice(t("result.exported"));
    } catch {
      setNotice(t("result.downloadFailed"));
    }
  }

  async function copyMarkdown() {
    await copyShareAsset(markdown);
  }

  async function copyText(text: string) {
    await copyShareAsset(text);
  }

  async function copyShareAsset(text: string) {
    const copied = await copyToClipboard(text);
    setNotice(copied ? t("result.copied") : t("result.copyFailed"));
    setManualCopyText(copied ? "" : text);
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      session,
      privacy,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "ai-council-session.json");
    setNotice(t("result.exported"));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div>
        <BackButton onClick={() => navigate("home")} />
        <div ref={exportRef} className="result-export">
          <div className="mb-5 flex items-center justify-between border-b border-stone-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">AI Council</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{result.title}</h1>
            </div>
            <span className="score-pill">{result.supportScore}%</span>
          </div>
          <div className="space-y-5">
            {!privacy.hideQuestion ? (
              <section>
                <h2 className="result-label">{language === "zh" ? "问题" : "Question"}</h2>
                <p className="result-text">{session.topic}</p>
              </section>
            ) : null}
            <section>
              <h2 className="result-label">{language === "zh" ? "结论" : "Verdict"}</h2>
              <p className="result-text large">{result.verdict}</p>
            </section>
            {!privacy.conclusionOnly ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ResultBlock title={language === "zh" ? "最强支持理由" : "Strongest support"} body={result.strongestSupport} />
                <ResultBlock title={language === "zh" ? "最强反对理由" : "Strongest objection"} body={result.strongestObjection} />
              </div>
            ) : null}
            {!privacy.conclusionOnly ? (
              <div className="grid gap-4 md:grid-cols-3">
                <ResultList title={t("result.actions")} items={result.actions} />
                <ResultList title={t("result.risks")} items={result.risks} />
                <ResultBlock title={t("result.minority")} body={result.minorityOpinion} />
              </div>
            ) : null}
            <section className="insight-strip">
              <span>{language === "zh" ? "关键洞察" : "Key insight"}</span>
              <p>{result.keyInsight}</p>
            </section>
          </div>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="surface-panel p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("result.privacy")}</h2>
          <PrivacyToggle label={t("result.hideQuestion")} checked={privacy.hideQuestion} onChange={(value) => setSharePrivacy({ hideQuestion: value })} />
          <PrivacyToggle label={t("result.hideBackground")} checked={privacy.hideBackground} onChange={(value) => setSharePrivacy({ hideBackground: value })} />
          <PrivacyToggle label={t("result.conclusionOnly")} checked={privacy.conclusionOnly} onChange={(value) => setSharePrivacy({ conclusionOnly: value })} />
          <PrivacyToggle label={t("result.redactSensitive")} checked={privacy.redactSensitive} onChange={(value) => setSharePrivacy({ redactSensitive: value })} />
        </div>
        <div className="surface-panel p-4">
          <h2 className="mb-3 text-sm font-semibold">{language === "zh" ? "导出与复用" : "Export and reuse"}</h2>
          <div className="mb-4 space-y-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-700">
            <div>
              <p className="result-label">{t("result.shareTitle")}</p>
              <p className="mt-1 font-medium text-stone-950">{shareTitle}</p>
            </div>
            <div>
              <p className="result-label">{t("result.briefingSummary")}</p>
              <p className="mt-1 whitespace-pre-wrap">{briefingSummary}</p>
            </div>
            {manualCopyText ? (
              <label className="field-label compact">
                <span>{t("result.manualCopy")}</span>
                <textarea
                  className="text-input min-h-28 resize-y font-mono text-xs"
                  readOnly
                  value={manualCopyText}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            ) : null}
          </div>
          <div className="grid gap-2">
            <button className="primary-button justify-center" onClick={() => void downloadImage()}>
              <Download size={16} />
              <span>{t("result.downloadImage")}</span>
            </button>
            <button className="secondary-button justify-center" onClick={() => void copyMarkdown()}>
              <Save size={16} />
              <span>{t("result.copyMarkdown")}</span>
            </button>
            <button className="secondary-button justify-center" onClick={() => void copyText(shareTitle)}>
              <Save size={16} />
              <span>{t("result.copyShareTitle")}</span>
            </button>
            <button className="secondary-button justify-center" onClick={() => void copyText(briefingSummary)}>
              <Save size={16} />
              <span>{t("result.copyBriefingSummary")}</span>
            </button>
            <button className="secondary-button justify-center" onClick={exportJson}>
              <FileJson size={16} />
              <span>{t("result.exportJson")}</span>
            </button>
            <button
              className="secondary-button justify-center"
              onClick={() => startMode(session.mode, session.topic)}
            >
              <RotateCcw size={16} />
              <span>{t("result.newRound")}</span>
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}

function ApiKeyModal() {
  const language = useAppStore((state) => state.language);
  const view = useAppStore((state) => state.view);
  const topic = useAppStore((state) => state.topic);
  const connections = useAppStore((state) => state.connections);
  const saveConnection = useAppStore((state) => state.saveConnection);
  const testConnection = useAppStore((state) => state.testConnection);
  const fetchModels = useAppStore((state) => state.fetchModels);
  const closeApiKeyModal = useAppStore((state) => state.closeApiKeyModal);
  const navigate = useAppStore((state) => state.navigate);
  const setNotice = useAppStore((state) => state.setNotice);
  const t = useMemo(() => createTranslator(language), [language]);
  const [draft, setDraft] = useState<ModelConnection>(() =>
    connections.find((connection) => !hasApiKeyForUi(connection)) ??
    connections[0] ??
    createDefaultConnection()
  );
  const [headersText, setHeadersText] = useState(
    draft.customHeaders ? JSON.stringify(draft.customHeaders, null, 2) : ""
  );
  const [pendingAction, setPendingAction] = useState<ConnectionAction>();
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>();
  const presets = useMemo(() => buildConnectionPresets(t), [t]);
  const selectedPreset = presets.find((preset) => preset.matches(draft));
  const isWorking = Boolean(pendingAction);

  useEffect(() => {
    if (!pendingAction) return;

    const message = connectionActionTimeoutMessage(language, pendingAction);
    const timeoutId = window.setTimeout(() => {
      setActionFeedback({ tone: "error", message });
      setNotice(message);
      setPendingAction(undefined);
    }, CONNECTION_ACTION_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [language, pendingAction, setNotice]);

  function actionLabel(action: ConnectionAction) {
    const seconds = Math.round(CONNECTION_ACTION_TIMEOUT_MS / 1000);
    if (language === "zh") {
      return {
        fetch: `正在获取模型（最多 ${seconds} 秒）...`,
        test: `正在测试连接（最多 ${seconds} 秒）...`,
        save: "正在保存...",
      }[action];
    }

    return {
      fetch: `Loading models, up to ${seconds}s...`,
      test: `Testing connection, up to ${seconds}s...`,
      save: "Saving...",
    }[action];
  }

  function feedbackMessage(tone: ActionFeedback["tone"], message: string) {
    setActionFeedback({ tone, message });
    setNotice(message);
  }

  function cancelPendingAction() {
    const message =
      language === "zh"
        ? "已停止等待连接测试结果。请检查 Base URL、协议、CORS 或中转服务状态。"
        : "Stopped waiting for the connection test. Check the Base URL, protocol, CORS, or relay status.";
    setPendingAction(undefined);
    feedbackMessage("error", message);
  }

  function actionTimeoutMessage(action: ConnectionAction) {
    return connectionActionTimeoutMessage(language, action);
  }

  function buildDraftFromForm() {
    if (!draft.apiKey?.trim()) {
      feedbackMessage("error", t("connections.keyRequired"));
      return null;
    }

    const trimmed = headersText.trim();
    if (!trimmed) {
      return { ...draft, customHeaders: undefined };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Headers must be an object.");
      }

      return { ...draft, customHeaders: parsed as Record<string, string> };
    } catch {
      feedbackMessage("error", t("connections.headersInvalid"));
      return null;
    }
  }

  async function saveDraft() {
    const nextDraft = buildDraftFromForm();
    if (!nextDraft) return;
    setPendingAction("save");
    setActionFeedback({ tone: "neutral", message: actionLabel("save") });
    try {
      await saveConnection(nextDraft);
      closeApiKeyModal();
      if (view === "home" && topic.trim()) {
        navigate("brief");
      }
    } catch (error) {
      feedbackMessage(
        "error",
        error instanceof Error
          ? error.message
          : language === "zh"
            ? "保存连接失败。"
            : "Failed to save the connection."
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function fetchDraftModels() {
    const nextDraft = buildDraftFromForm();
    if (!nextDraft) return;
    setPendingAction("fetch");
    setActionFeedback({ tone: "neutral", message: actionLabel("fetch") });
    try {
      await saveConnection(nextDraft);
      const updatedConnection = await withTimeout(
        fetchModels(nextDraft),
        CONNECTION_ACTION_TIMEOUT_MS,
        actionTimeoutMessage("fetch")
      );
      if (updatedConnection) {
        setDraft(updatedConnection);
        setHeadersText(
          updatedConnection.customHeaders
            ? JSON.stringify(updatedConnection.customHeaders, null, 2)
            : ""
        );
        feedbackMessage("success", updatedConnection.statusMessage ?? t("connections.modelsLoaded"));
        return;
      }
      feedbackMessage(
        "error",
        useAppStore.getState().notice ??
          (language === "zh" ? "未能获取模型列表。" : "Could not load the model list.")
      );
    } catch (error) {
      feedbackMessage(
        "error",
        error instanceof Error
          ? error.message
          : language === "zh"
            ? "未能获取模型列表。"
            : "Could not load the model list."
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function saveAndTestDraft() {
    const nextDraft = buildDraftFromForm();
    if (!nextDraft) return;
    setPendingAction("test");
    setActionFeedback({ tone: "neutral", message: actionLabel("test") });
    try {
      await saveConnection(nextDraft);
      await withTimeout(
        testConnection(nextDraft.id),
        CONNECTION_ACTION_TIMEOUT_MS,
        actionTimeoutMessage("test")
      );
      const testedConnection = useAppStore
        .getState()
        .connections.find((connection) => connection.id === nextDraft.id);
      const message =
        testedConnection?.statusMessage ??
        (language === "zh" ? "连接测试已完成。" : "Connection test finished.");
      feedbackMessage(testedConnection?.status === "failed" ? "error" : "success", message);
    } catch (error) {
      feedbackMessage(
        "error",
        error instanceof Error
          ? error.message
          : language === "zh"
            ? "连接测试失败。"
            : "Connection test failed."
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  function applyProviderPreset(preset: ConnectionPreset) {
    setDraft({
      ...draft,
      name: preset.name,
      protocol: preset.protocol,
      baseUrl: preset.baseUrl,
      model: preset.model,
      availableModels: preset.availableModels,
      customHeaders: undefined,
    });
    setHeadersText(preset.headersText ?? "");
  }

  return (
    <div className="modal-scrim" role="presentation">
      <section
        aria-labelledby="api-key-modal-title"
        aria-modal="true"
        className="api-key-modal"
        role="dialog"
      >
        <div className="connection-card-header">
          <div>
            <p className="connection-eyebrow">AI Council</p>
            <h2 id="api-key-modal-title">{t("connections.requiredTitle")}</h2>
            <p>{t("connections.requiredBody")}</p>
          </div>
          <button className="secondary-button" onClick={closeApiKeyModal}>
            <span>{t("connections.closeSetup")}</span>
          </button>
        </div>

        <div className="provider-dock" aria-label={t("connections.presets")}>
          {presets.map((preset) => (
            <button
              className={clsx("provider-pill", selectedPreset?.id === preset.id && "selected")}
              disabled={isWorking}
              key={preset.id}
              onClick={() => applyProviderPreset(preset)}
            >
              <span>{preset.label}</span>
              <small>{preset.shortLabel}</small>
            </button>
          ))}
        </div>

        <div className="connection-form-grid">
          <label className="field-label compact">
            <span>{t("connections.name")}</span>
            <input className="text-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="field-label compact">
            <span>{t("connections.model")}</span>
            {draft.availableModels && draft.availableModels.length > 0 ? (
              <select
                className="text-input"
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              >
                {draft.availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input className="text-input" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
            )}
          </label>
          <label className="field-label compact connection-api-key">
            <span>{t("connections.apiKey")}</span>
            <input
              autoFocus
              className="text-input"
              type="password"
              value={draft.apiKey ?? ""}
              onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
            />
          </label>
        </div>

        <details className="connection-details">
          <summary>
            <span>{language === "zh" ? "Endpoint 与协议" : "Endpoint and protocol"}</span>
            <ChevronRight size={16} />
          </summary>
          <div className="connection-details-grid">
            <label className="field-label compact">
              <span>{t("connections.protocol")}</span>
              <select
                className="text-input"
                value={draft.protocol}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    availableModels: undefined,
                    protocol: event.target.value as ModelProtocol,
                  })
                }
              >
                <option value="openai-chat-completions">OpenAI-compatible Chat Completions</option>
                <option value="openai-responses">OpenAI Responses</option>
                <option value="anthropic-messages">Anthropic Messages</option>
                <option value="gemini">Gemini</option>
                <option value="ollama">Ollama / LM Studio</option>
                <option value="custom">Custom JSON</option>
              </select>
            </label>
            <label className="field-label compact">
              <span>{t("connections.baseUrl")}</span>
              <input className="text-input" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
            </label>
          </div>
        </details>

        <details className="connection-details">
          <summary>
            <span>{language === "zh" ? "Headers 与本地保存" : "Headers and local storage"}</span>
            <ChevronRight size={16} />
          </summary>
          <label className="field-label compact">
            <span>{t("connections.headers")}</span>
            <textarea
              className="text-input min-h-24 resize-y font-mono text-xs"
              value={headersText}
              onChange={(event) => setHeadersText(event.target.value)}
              placeholder='{"HTTP-Referer":"https://example.com"}'
            />
            <span className="text-xs font-normal leading-5 text-stone-500">
              {t("connections.headersHelp")}
            </span>
          </label>
          <label className="connection-toggle">
            <input
              type="checkbox"
              checked={draft.secretStorage === "local"}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  secretStorage: event.target.checked ? "local" : "session",
                })
              }
            />
            <span>{t("connections.storeKey")}</span>
          </label>
        </details>

        {actionFeedback ? (
          <p
            aria-live="polite"
            className={clsx("connection-action-feedback", actionFeedback.tone)}
            role={actionFeedback.tone === "error" ? "alert" : "status"}
          >
            {actionFeedback.message}
          </p>
        ) : null}

        <div className="connection-actions">
          <button
            className="secondary-button"
            disabled={isWorking}
            onClick={() => void fetchDraftModels()}
          >
            <Bot size={16} />
            <span>{pendingAction === "fetch" ? actionLabel("fetch") : t("connections.fetchModels")}</span>
          </button>
          <button
            className="secondary-button"
            disabled={isWorking}
            onClick={() => void saveAndTestDraft()}
          >
            <ShieldCheck size={16} />
            <span>{pendingAction === "test" ? actionLabel("test") : t("connections.test")}</span>
          </button>
          <button
            className="primary-button"
            disabled={isWorking}
            onClick={() => void saveDraft()}
          >
            <Save size={16} />
            <span>{pendingAction === "save" ? actionLabel("save") : t("connections.save")}</span>
          </button>
          {isWorking ? (
            <button className="secondary-button" onClick={cancelPendingAction}>
              <span>{language === "zh" ? "停止等待" : "Stop waiting"}</span>
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ConnectionsView() {
  const language = useAppStore((state) => state.language);
  const connections = useAppStore((state) => state.connections);
  const addBlankConnection = useAppStore((state) => state.addBlankConnection);
  const clearAllLocalData = useAppStore((state) => state.clearAllLocalData);
  const t = useMemo(() => createTranslator(language), [language]);
  const configuredCount = connections.filter(hasApiKeyForUi).length;

  return (
    <section className="connections-screen">
      <div className="connections-hero">
        <div>
          <p className="connection-eyebrow">AI Council</p>
          <h1>{t("connections.title")}</h1>
          <p>{t("connections.subtitle")}</p>
        </div>
        <div className="connection-stats">
          <span>{configuredCount}/{connections.length}</span>
          <small>{language === "zh" ? "已配置 Key" : "keys set"}</small>
        </div>
        <button className="primary-button" onClick={addBlankConnection}>
          <Plus size={16} />
          <span>{t("connections.add")}</span>
        </button>
      </div>
      <div className="connection-timeline" aria-label={language === "zh" ? "连接概览" : "Connection overview"}>
        {connections.map((connection) => (
          <span className={clsx("timeline-pill", connection.status)} key={connection.id}>
            <StatusIcon status={connection.status} />
            <span>{connection.name}</span>
          </span>
        ))}
      </div>
      <div className="connections-layout">
        <div className="grid min-w-0 gap-4">
          {connections.length > 0 ? (
            connections.map((connection) => (
              <ConnectionCard key={connection.id} connection={connection} />
            ))
          ) : (
            <div className="connection-empty">
              <h2>{t("connections.emptyTitle")}</h2>
              <p>{t("connections.emptyBody")}</p>
              <button className="primary-button" onClick={addBlankConnection}>
                <Plus size={16} />
                <span>{t("connections.add")}</span>
              </button>
            </div>
          )}
        </div>
        <aside className="connection-sidecar">
          <div>
            <p className="connection-eyebrow">{language === "zh" ? "席位策略" : "Seat strategy"}</p>
            <h2>{language === "zh" ? "从一个 Key 开始" : "Start with one key"}</h2>
            <p>
              {language === "zh"
                ? "先用一个模型完成会议。需要更广模型覆盖时，再把关键角色分配给不同供应商。"
                : "Start with one model for the full meeting. Add providers later when you need broader model coverage."}
            </p>
          </div>
          <div className="sidecar-meter">
            <span>{connections.length}</span>
            <small>{language === "zh" ? "正式连接" : "real connections"}</small>
          </div>
        </aside>
      </div>
      <div className="mt-4 surface-panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-950">{t("privacy.localData")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
              {t("privacy.clearAllHint")}
            </p>
          </div>
          <button className="danger-button" onClick={() => void clearAllLocalData()}>
            <Trash2 size={16} />
            <span>{t("privacy.clearAll")}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function ConnectionCard({ connection }: { connection: ModelConnection }) {
  const language = useAppStore((state) => state.language);
  const saveConnection = useAppStore((state) => state.saveConnection);
  const testConnection = useAppStore((state) => state.testConnection);
  const fetchModels = useAppStore((state) => state.fetchModels);
  const deleteConnection = useAppStore((state) => state.deleteConnection);
  const setNotice = useAppStore((state) => state.setNotice);
  const t = useMemo(() => createTranslator(language), [language]);
  const [draft, setDraft] = useState(connection);
  const [headersText, setHeadersText] = useState(
    connection.customHeaders ? JSON.stringify(connection.customHeaders, null, 2) : ""
  );
  const presets = useMemo(() => buildConnectionPresets(t), [t]);
  const selectedPreset = presets.find((preset) => preset.matches(draft));

  function buildDraftFromForm(options: { requireKey?: boolean } = {}) {
    if (options.requireKey && !draft.apiKey?.trim()) {
      setNotice(t("connections.keyRequired"));
      return null;
    }

    const trimmed = headersText.trim();
    if (!trimmed) {
      return { ...draft, customHeaders: undefined };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Headers must be an object.");
      }

      return { ...draft, customHeaders: parsed as Record<string, string> };
    } catch {
      setNotice(t("connections.headersInvalid"));
      return null;
    }
  }

  async function saveDraft() {
    const nextDraft = buildDraftFromForm({ requireKey: true });
    if (!nextDraft) return;
    await saveConnection(nextDraft);
  }

  async function saveAndTestDraft() {
    const nextDraft = buildDraftFromForm({ requireKey: true });
    if (!nextDraft) return;
    await saveConnection(nextDraft);
    await testConnection(nextDraft.id);
  }

  async function fetchDraftModels() {
    const nextDraft = buildDraftFromForm({ requireKey: true });
    if (!nextDraft) return;
    await saveConnection(nextDraft);
    const updatedConnection = await fetchModels(nextDraft);
    if (updatedConnection) {
      setDraft(updatedConnection);
      setHeadersText(
        updatedConnection.customHeaders
          ? JSON.stringify(updatedConnection.customHeaders, null, 2)
          : ""
      );
    }
  }

  function applyPreset(preset: Partial<ModelConnection>, headers = "") {
    setDraft({
      ...draft,
      availableModels: undefined,
      customHeaders: undefined,
      ...preset,
    });
    setHeadersText(headers);
  }

  function applyProviderPreset(preset: ConnectionPreset) {
    applyPreset(
      {
        name: preset.name,
        protocol: preset.protocol,
        baseUrl: preset.baseUrl,
        model: preset.model,
        availableModels: preset.availableModels,
      },
      preset.headersText ?? ""
    );
  }

  return (
    <details className="connection-card" open={!hasApiKeyForUi(connection) || connection.status !== "connected"}>
      <summary className="connection-card-header">
        <div>
          <p className="connection-eyebrow">{protocolLabel(draft.protocol)}</p>
          <h2>{draft.name}</h2>
          <p title={draft.model}>{draft.model}</p>
        </div>
        <span className={clsx("connection-status", connection.status)}>
          <StatusIcon status={connection.status} />
          <span>{connection.statusMessage ?? statusText(connection.status, t)}</span>
        </span>
      </summary>
      <div className="connection-flow">
          <div className="provider-dock" aria-label={t("connections.presets")}>
            {presets.map((preset) => (
              <button
                className={clsx("provider-pill", selectedPreset?.id === preset.id && "selected")}
                key={preset.id}
                onClick={() => applyProviderPreset(preset)}
              >
                <span>{preset.label}</span>
                <small>{preset.shortLabel}</small>
              </button>
            ))}
          </div>

          <div className="connection-form-grid">
            <label className="field-label compact">
              <span>{t("connections.name")}</span>
              <input className="text-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label className="field-label compact">
              <span>{t("connections.model")}</span>
              {draft.availableModels && draft.availableModels.length > 0 ? (
                <select
                  className="text-input"
                  value={draft.model}
                  onChange={(event) => setDraft({ ...draft, model: event.target.value })}
                >
                  {draft.availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="text-input" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
              )}
            </label>
            <label className="field-label compact connection-api-key">
              <span>{t("connections.apiKey")}</span>
              <input
                className="text-input"
                type="password"
                value={draft.apiKey ?? ""}
                onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
              />
            </label>
          </div>

          <details className="connection-details">
            <summary>
              <span>{language === "zh" ? "Endpoint 与协议" : "Endpoint and protocol"}</span>
              <ChevronRight size={16} />
            </summary>
            <div className="connection-details-grid">
              <label className="field-label compact">
                <span>{t("connections.protocol")}</span>
                <select
                  className="text-input"
                  value={draft.protocol}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      availableModels: undefined,
                      protocol: event.target.value as ModelProtocol,
                    })
                  }
                >
                  <option value="openai-chat-completions">OpenAI-compatible Chat Completions</option>
                  <option value="openai-responses">OpenAI Responses</option>
                  <option value="anthropic-messages">Anthropic Messages</option>
                  <option value="gemini">Gemini</option>
                  <option value="ollama">Ollama / LM Studio</option>
                  <option value="custom">Custom JSON</option>
                </select>
              </label>
              <label className="field-label compact">
                <span>{t("connections.baseUrl")}</span>
                <input className="text-input" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
              </label>
            </div>
          </details>

          <details className="connection-details">
            <summary>
              <span>{language === "zh" ? "Headers 与本地保存" : "Headers and local storage"}</span>
              <ChevronRight size={16} />
            </summary>
            <label className="field-label compact">
              <span>{t("connections.headers")}</span>
              <textarea
                className="text-input min-h-24 resize-y font-mono text-xs"
                value={headersText}
                onChange={(event) => setHeadersText(event.target.value)}
                placeholder='{"HTTP-Referer":"https://example.com"}'
              />
              <span className="text-xs font-normal leading-5 text-stone-500">
                {t("connections.headersHelp")}
              </span>
            </label>
            <label className="connection-toggle">
              <input
                type="checkbox"
                checked={draft.secretStorage === "local"}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    secretStorage: event.target.checked ? "local" : "session",
                  })
                }
              />
              <span>{t("connections.storeKey")}</span>
            </label>
            <p className="connection-hint">{t("connections.corsHint")}</p>
          </details>

          <div className="connection-actions">
            <button className="secondary-button" onClick={() => void saveDraft()}>
              <Save size={16} />
              <span>{t("connections.save")}</span>
            </button>
            <button className="secondary-button" onClick={() => void fetchDraftModels()}>
              <Bot size={16} />
              <span>{t("connections.fetchModels")}</span>
            </button>
            <button className="primary-button" onClick={() => void saveAndTestDraft()}>
              <ShieldCheck size={16} />
              <span>{t("connections.test")}</span>
            </button>
            <button className="danger-button" onClick={() => void deleteConnection(draft.id)}>
              <Trash2 size={16} />
              <span>{t("connections.delete")}</span>
            </button>
          </div>
      </div>
    </details>
  );
}

type ConnectionPreset = {
  id: string;
  label: string;
  shortLabel: string;
  name: string;
  protocol: ModelProtocol;
  baseUrl: string;
  model: string;
  availableModels?: string[];
  headersText?: string;
  matches: (connection: ModelConnection) => boolean;
};

function createDefaultConnection(): ModelConnection {
  return {
    id: createId("connection"),
    name: "OpenAI Official",
    protocol: "openai-chat-completions",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    availableModels: [],
    secretStorage: "session",
    status: "untested",
  };
}

function hasApiKeyForUi(connection: ModelConnection) {
  return Boolean(connection.apiKey?.trim());
}

function roleConnectionOptions(
  usableConnections: ModelConnection[],
  allConnections: ModelConnection[],
  selectedConnectionId: string
) {
  const selectedConnection = allConnections.find((connection) => connection.id === selectedConnectionId);
  if (
    selectedConnection &&
    !usableConnections.some((connection) => connection.id === selectedConnection.id)
  ) {
    return [...usableConnections, selectedConnection];
  }

  return usableConnections;
}

function buildConnectionPresets(
  t: ReturnType<typeof createTranslator>
): ConnectionPreset[] {
  const openRouterHeaders = JSON.stringify(
    {
      "HTTP-Referer": window.location.origin,
      "X-Title": "AI Council",
    },
    null,
    2
  );

  const presets: Array<Omit<ConnectionPreset, "matches">> = [
    {
      id: "openai-chat",
      label: t("connections.openaiPreset"),
      shortLabel: "Chat",
      name: "OpenAI Official",
      protocol: "openai-chat-completions",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
    },
    {
      id: "openai-responses",
      label: t("connections.openaiResponsesPreset"),
      shortLabel: "Responses",
      name: "OpenAI Responses",
      protocol: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
    },
    {
      id: "deepseek",
      label: t("connections.deepseekPreset"),
      shortLabel: "DeepSeek",
      name: "DeepSeek Official",
      protocol: "openai-chat-completions",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-flash",
      availableModels: ["deepseek-v4-flash", "deepseek-v4-pro"],
    },
    {
      id: "anthropic",
      label: t("connections.anthropicPreset"),
      shortLabel: "Messages",
      name: "Anthropic",
      protocol: "anthropic-messages",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-5",
    },
    {
      id: "gemini",
      label: t("connections.geminiPreset"),
      shortLabel: "Google",
      name: "Gemini",
      protocol: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.5-flash",
    },
    {
      id: "ollama",
      label: t("connections.ollamaPreset"),
      shortLabel: "Local",
      name: "Ollama Local",
      protocol: "ollama",
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    },
    {
      id: "openrouter",
      label: t("connections.openrouterPreset"),
      shortLabel: "Relay",
      name: "OpenRouter Compatible",
      protocol: "openai-chat-completions",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      headersText: openRouterHeaders,
    },
    {
      id: "custom-relay",
      label: t("connections.relayPreset"),
      shortLabel: "Relay",
      name: "Custom Relay",
      protocol: "openai-chat-completions",
      baseUrl: "https://your-relay.example.com/v1",
      model: "your-model-id",
    },
    {
      id: "custom-json",
      label: t("connections.customJsonPreset"),
      shortLabel: "JSON",
      name: "Custom JSON",
      protocol: "custom",
      baseUrl: "https://your-endpoint.example.com/invoke",
      model: "your-model-id",
    },
  ];

  return presets.map((preset) => ({
    ...preset,
    matches: (connection) =>
      connection.protocol === preset.protocol &&
      connection.baseUrl === preset.baseUrl &&
      (connection.name === preset.name || connection.model === preset.model),
  }));
}

function protocolLabel(protocol: ModelProtocol) {
  const labels: Record<ModelProtocol, string> = {
    "openai-chat-completions": "Chat Completions",
    "openai-responses": "Responses",
    "anthropic-messages": "Anthropic Messages",
    gemini: "Gemini",
    ollama: "Ollama / LM Studio",
    custom: "Custom JSON",
  };

  return labels[protocol];
}

function HistoryView() {
  const language = useAppStore((state) => state.language);
  const sessions = useAppStore((state) => state.sessions);
  const viewResult = useAppStore((state) => state.viewResult);
  const clearLocalHistory = useAppStore((state) => state.clearLocalHistory);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("history.title")}</h1>
          <p className="mt-1 text-sm text-stone-600">{t("common.localOnly")}</p>
        </div>
        <button className="danger-button" onClick={() => void clearLocalHistory()}>
          <Trash2 size={16} />
          <span>{t("history.clear")}</span>
        </button>
      </div>
      {sessions.length === 0 ? (
        <EmptyState label={t("history.empty")} />
      ) : (
        <div className="surface-panel divide-y divide-stone-200">
          {sessions.map((session) => (
            <div className="history-row" key={session.id}>
              <button className="min-w-0 flex-1 text-left" onClick={() => viewResult(session)}>
                <span className="block font-medium">{session.topic}</span>
                <span className="block text-xs text-stone-500">{new Date(session.updatedAt).toLocaleString()}</span>
              </button>
              <button
                className="danger-icon-button"
                title={t("history.delete")}
                onClick={() => void deleteSession(session.id)}
              >
                <Trash2 size={16} />
              </button>
              <ChevronRight className="text-stone-400" size={16} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ResultBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="result-label">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
    </section>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="result-label">{title}</h2>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-stone-700">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PrivacyToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-stone-100 py-2 text-sm text-stone-700 last:border-b-0">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function StatusIcon({ status }: { status: ModelConnection["status"] }) {
  if (status === "connected") {
    return <CheckCircle2 className="text-emerald-600" size={18} />;
  }

  if (status === "failed") {
    return <ShieldCheck className="text-red-600" size={18} />;
  }

  return <ShieldCheck className="text-stone-400" size={18} />;
}

function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button className={clsx("nav-button", active && "active")} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

function statusText(
  status: ModelConnection["status"],
  t: ReturnType<typeof createTranslator>
) {
  if (status === "connected") return t("common.connected");
  if (status === "failed") return t("common.failed");
  return t("common.untested");
}

function connectionActionTimeoutMessage(language: "en" | "zh", action: ConnectionAction) {
  if (language === "zh") {
    return {
      fetch: "获取模型超时。请检查 Base URL、协议、CORS 或中转服务状态。",
      test: "测试连接超时。请检查 Base URL、协议、CORS 或中转服务状态。",
      save: "保存连接超时，请重试。",
    }[action];
  }

  return {
    fetch: "Loading models timed out. Check the Base URL, protocol, CORS, or relay status.",
    test: "Connection test timed out. Check the Base URL, protocol, CORS, or relay status.",
    save: "Saving the connection timed out. Try again.",
  }[action];
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Browser permission can deny clipboard writes in embedded or insecure contexts.
  }

  if (copyViaClipboardEvent(text)) {
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function copyViaClipboardEvent(text: string) {
  let copied = false;
  const onCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData("text/plain", text);
    event.preventDefault();
    copied = true;
  };

  try {
    document.addEventListener("copy", onCopy);
    return document.execCommand("copy") && copied;
  } catch {
    return false;
  } finally {
    document.removeEventListener("copy", onCopy);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 0);
}

function formatStage(stage: SessionStage, language: "en" | "zh") {
  const labels: Record<SessionStage, { en: string; zh: string }> = {
    opening: { en: "Opening", zh: "开场观点" },
    rebuttal: { en: "Rebuttal", zh: "反驳" },
    revision: { en: "Revision", zh: "修正立场" },
    crossExam: { en: "Cross-exam", zh: "交叉质询" },
    riskReview: { en: "Risk review", zh: "风险审查" },
    vote: { en: "Vote", zh: "投票" },
    summary: { en: "Summary", zh: "总结" },
  };

  return labels[stage][language];
}

function calculateDiversityScore(roles: { modelConnectionId: string }[]) {
  if (roles.length === 0) {
    return 0;
  }

  const uniqueSeats = new Set(roles.map((role) => role.modelConnectionId)).size;
  const configuredSeats = roles.filter((role) => role.modelConnectionId).length;
  const base = 28;
  const spread = Math.min(42, uniqueSeats * 14);
  const realModelBoost = Math.min(30, configuredSeats * 8);
  return Math.min(100, base + spread + realModelBoost);
}

function BackButton({ onClick }: { onClick: () => void }) {
  const language = useAppStore((state) => state.language);
  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <button className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950" onClick={onClick}>
      <ArrowLeft size={16} />
      <span>{t("common.back")}</span>
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="surface-panel flex min-h-64 items-center justify-center p-6 text-center text-sm text-stone-500">
      {label}
    </div>
  );
}
