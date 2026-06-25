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

const presetTopics = {
  en: [
    "Should ordinary people still learn programming?",
    "Should I quit my job to build an AI product?",
    "Is now a good time to buy a home?",
  ],
  zh: [
    "普通人现在还要不要学编程？",
    "我要不要辞职做一个 AI 产品？",
    "现在是不是适合买房？",
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
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
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
        <footer className="flex flex-col gap-2 border-t border-stone-200 py-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
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
    <header className="flex flex-col gap-4 border-b border-stone-200 py-4 lg:flex-row lg:items-center lg:justify-between">
      <button className="flex w-fit items-center gap-3 text-left" onClick={() => navigate("home")}>
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
  const startMode = useAppStore((state) => state.startMode);
  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <div className="section-kicker">
          <Sparkles size={16} />
          <span>{language === "zh" ? "先围观，再复刻" : "Watch first, then remix"}</span>
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          {language === "zh"
            ? "把复杂问题交给一场 AI 圆桌。"
            : "Turn hard questions into an AI roundtable."}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-stone-600">
          {language === "zh"
            ? "娱乐版制造冲突和金句，决策版控制假设和风险。第一版本地运行，不建账号，不上传对话。"
            : "The playful mode creates conflict and quotes. The serious mode controls assumptions and risk. v1 runs local-first without accounts or uploaded conversations."}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <ModePanel
            mode="arena"
            title={t("home.arena.title")}
            body={t("home.arena.body")}
            onStart={() => startMode("arena")}
          />
          <ModePanel
            mode="council"
            title={t("home.council.title")}
            body={t("home.council.body")}
            onStart={() => startMode("council")}
          />
        </div>
      </div>
      <aside className="surface-panel p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">{t("home.tryPreset")}</h2>
          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
            Mock ready
          </span>
        </div>
        <div className="space-y-2">
          {presetTopics[language].map((topic) => (
            <button
              key={topic}
              className="preset-row"
              onClick={() => startMode("arena", topic)}
            >
              <span>{topic}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

function ModePanel({
  mode,
  title,
  body,
  onStart,
}: {
  mode: AppMode;
  title: string;
  body: string;
  onStart: () => void;
}) {
  const language = useAppStore((state) => state.language);
  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <div className={clsx("mode-panel", mode === "arena" ? "mode-arena" : "mode-council")}>
      <div className="flex items-center gap-2">
        <span className="mode-dot" />
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="min-h-[72px] text-sm leading-6 text-stone-600">{body}</p>
      <button className="primary-button mt-auto" onClick={onStart}>
        <Play size={16} />
        <span>{t("home.start")}</span>
      </button>
    </div>
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
  const roleCount = mode === "arena" ? 5 : 6;

  return (
    <section className="mx-auto max-w-4xl">
      <BackButton onClick={() => navigate("home")} />
      <div className="surface-panel p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("brief.title")}</h1>
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
          <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t("common.estimatedCalls")}: {estimateCalls(roleCount, depth)}
            </span>
            <span>
              {t("common.cost")}: {depthLimits[depth].costLevel}
            </span>
          </div>
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

  return (
    <section>
      <BackButton onClick={() => navigate("brief")} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("lineup.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{t("lineup.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button" onClick={autoAssignRoles}>
            <Sparkles size={16} />
            <span>{t("lineup.autoAssign")}</span>
          </button>
          <button className="secondary-button" onClick={regenerateRoles}>
            <RotateCcw size={16} />
            <span>{t("lineup.regenerate")}</span>
          </button>
          <button className="primary-button" onClick={() => void runSession()}>
            <Play size={16} />
            <span>{t("lineup.start")}</span>
          </button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
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
      <div className="mb-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px] md:items-center">
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
      <div className="grid gap-3 lg:grid-cols-2">
        {roles.map((role) => (
          <div className="role-card" key={role.id}>
            <input
              className="role-title-input"
              value={role.name}
              onChange={(event) => updateRole(role.id, { name: event.target.value })}
            />
            <textarea
              className="role-duty-input"
              value={role.duty}
              onChange={(event) => updateRole(role.id, { duty: event.target.value })}
            />
            <label className="field-label compact">
              <span>{t("lineup.model")}</span>
              <select
                className="text-input"
                value={role.modelConnectionId}
                onChange={(event) => updateRole(role.id, { modelConnectionId: event.target.value })}
              >
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name} / {connection.model}
                  </option>
                ))}
              </select>
            </label>
            <details className="advanced-role-panel">
              <summary>{t("lineup.prompt")}</summary>
              <textarea
                className="role-prompt-input"
                value={role.prompt}
                onChange={(event) => updateRole(role.id, { prompt: event.target.value })}
              />
            </details>
          </div>
        ))}
      </div>
    </section>
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
  const posterRef = useRef<HTMLDivElement>(null);

  if (!session?.result) {
    return <EmptyState label={language === "zh" ? "还没有结果。" : "No result yet."} />;
  }

  const result = session.result;
  const markdown = sessionToMarkdown(session, privacy, language);
  const shareTitle =
    language === "zh"
      ? `我让 AI Council 讨论了：${session.topic}`
      : `I asked AI Council to debate: ${session.topic}`;
  const videoScript =
    language === "zh"
      ? `开场：我把「${session.topic}」交给 AI Council。\n冲突：支持方认为机会窗口存在，反方提醒关键事实不足。\n反转：最狠一句是「${result.sharpestQuote}」\n结尾：最终建议是先做小规模验证。`
      : `Hook: I gave AI Council this question: "${session.topic}".\nConflict: supporters saw an opportunity window, while skeptics warned that key facts were missing.\nTurn: the sharpest line was "${result.sharpestQuote}".\nClose: the verdict is to run a small validation first.`;

  async function downloadPoster() {
    if (!posterRef.current) return;
    const dataUrl = await toPng(posterRef.current, {
      pixelRatio: 2,
      backgroundColor: "#fafaf9",
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "ai-council-result.png";
    link.click();
  }

  async function copyMarkdown() {
    setNotice((await copyToClipboard(markdown)) ? t("result.copied") : t("result.copyFailed"));
  }

  async function copyText(text: string) {
    setNotice((await copyToClipboard(text)) ? t("result.copied") : t("result.copyFailed"));
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
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ai-council-session.json";
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(t("result.exported"));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div>
        <BackButton onClick={() => navigate("home")} />
        <div ref={posterRef} className="result-poster">
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
            <section className="quote-strip">{result.sharpestQuote}</section>
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
          <h2 className="mb-3 text-sm font-semibold">{language === "zh" ? "传播素材" : "Share kit"}</h2>
          <div className="mb-4 space-y-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-700">
            <div>
              <p className="result-label">{t("result.shareTitle")}</p>
              <p className="mt-1 font-medium text-stone-950">{shareTitle}</p>
            </div>
            <div>
              <p className="result-label">{t("result.videoScript")}</p>
              <p className="mt-1 whitespace-pre-wrap">{videoScript}</p>
            </div>
          </div>
          <div className="grid gap-2">
            <button className="primary-button justify-center" onClick={() => void downloadPoster()}>
              <Download size={16} />
              <span>{t("result.downloadPoster")}</span>
            </button>
            <button className="secondary-button justify-center" onClick={() => void copyMarkdown()}>
              <Save size={16} />
              <span>{t("result.copyMarkdown")}</span>
            </button>
            <button className="secondary-button justify-center" onClick={() => void copyText(shareTitle)}>
              <Save size={16} />
              <span>{t("result.copyShareTitle")}</span>
            </button>
            <button className="secondary-button justify-center" onClick={() => void copyText(videoScript)}>
              <Save size={16} />
              <span>{t("result.copyVideoScript")}</span>
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

function ConnectionsView() {
  const language = useAppStore((state) => state.language);
  const connections = useAppStore((state) => state.connections);
  const addBlankConnection = useAppStore((state) => state.addBlankConnection);
  const clearAllLocalData = useAppStore((state) => state.clearAllLocalData);
  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("connections.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{t("connections.subtitle")}</p>
        </div>
        <button className="primary-button" onClick={addBlankConnection}>
          <Plus size={16} />
          <span>{t("connections.add")}</span>
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {connections.map((connection) => (
          <ConnectionCard key={connection.id} connection={connection} />
        ))}
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
  const deleteConnection = useAppStore((state) => state.deleteConnection);
  const setNotice = useAppStore((state) => state.setNotice);
  const t = useMemo(() => createTranslator(language), [language]);
  const [draft, setDraft] = useState(connection);
  const [headersText, setHeadersText] = useState(
    connection.customHeaders ? JSON.stringify(connection.customHeaders, null, 2) : ""
  );
  const isMock = draft.protocol === "mock";

  function buildDraftFromForm() {
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
    const nextDraft = buildDraftFromForm();
    if (!nextDraft) return;
    await saveConnection(nextDraft);
  }

  async function saveAndTestDraft() {
    const nextDraft = buildDraftFromForm();
    if (!nextDraft) return;
    await saveConnection(nextDraft);
    await testConnection(nextDraft.id);
  }

  return (
    <div className="surface-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon status={connection.status} />
          <h2 className="text-sm font-semibold">{connection.name}</h2>
        </div>
        <span className="text-xs text-stone-500">{connection.statusMessage ?? statusText(connection.status, t)}</span>
      </div>
      {isMock ? (
        <p className="text-sm text-stone-600">{t("connections.mockReady")}</p>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t("connections.presets")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="preset-chip"
                onClick={() => {
                  setDraft({
                    ...draft,
                    name: "OpenAI Official",
                    baseUrl: "https://api.openai.com/v1",
                    model: "gpt-4.1-mini",
                    customHeaders: undefined,
                  });
                  setHeadersText("");
                }}
              >
                {t("connections.openaiPreset")}
              </button>
              <button
                className="preset-chip"
                onClick={() => {
                  setDraft({
                    ...draft,
                    name: "OpenRouter Compatible",
                    baseUrl: "https://openrouter.ai/api/v1",
                    model: "openai/gpt-4.1-mini",
                  });
                  setHeadersText(
                    JSON.stringify(
                      {
                        "HTTP-Referer": window.location.origin,
                        "X-Title": "AI Council",
                      },
                      null,
                      2
                    )
                  );
                }}
              >
                {t("connections.openrouterPreset")}
              </button>
              <button
                className="preset-chip"
                onClick={() => {
                  setDraft({
                    ...draft,
                    name: "Custom Relay",
                    baseUrl: "https://your-relay.example.com/v1",
                    model: "your-model-id",
                    customHeaders: undefined,
                  });
                  setHeadersText("");
                }}
              >
                {t("connections.relayPreset")}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              {t("connections.corsHint")}
            </p>
          </div>
          <label className="field-label compact">
            <span>{t("connections.name")}</span>
            <input className="text-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="field-label compact">
            <span>{t("connections.protocol")}</span>
            <select
              className="text-input"
              value={draft.protocol}
              onChange={(event) =>
                setDraft({ ...draft, protocol: event.target.value as ModelProtocol })
              }
            >
              <option value="openai-chat-completions">OpenAI-compatible Chat Completions</option>
              <option value="openai-responses" disabled>OpenAI Responses ({t("connections.unsupported")})</option>
              <option value="anthropic-messages" disabled>Anthropic Messages ({t("connections.unsupported")})</option>
              <option value="gemini" disabled>Gemini ({t("connections.unsupported")})</option>
              <option value="ollama" disabled>Ollama / LM Studio ({t("connections.unsupported")})</option>
              <option value="custom" disabled>Custom ({t("connections.unsupported")})</option>
            </select>
          </label>
          <label className="field-label compact">
            <span>{t("connections.baseUrl")}</span>
            <input className="text-input" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
          </label>
          <label className="field-label compact">
            <span>{t("connections.model")}</span>
            <input className="text-input" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
          </label>
          <label className="field-label compact">
            <span>{t("connections.apiKey")}</span>
            <input
              className="text-input"
              type="password"
              value={draft.apiKey ?? ""}
              onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
            />
          </label>
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
          <label className="flex items-center gap-2 text-sm text-stone-700">
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
          <div className="flex gap-2">
            <button className="secondary-button" onClick={() => void saveDraft()}>
              <Save size={16} />
              <span>{t("connections.save")}</span>
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
      )}
    </div>
  );
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

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Browser permission can deny clipboard writes in embedded or insecure contexts.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
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
  const nonMockSeats = roles.filter((role) => role.modelConnectionId !== "mock").length;
  const base = 28;
  const spread = Math.min(42, uniqueSeats * 14);
  const realModelBoost = Math.min(30, nonMockSeats * 8);
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
