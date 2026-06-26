import type { Language } from "../types";

export type TranslationKey =
  | "app.subtitle"
  | "nav.home"
  | "nav.connections"
  | "nav.history"
  | "home.arena.title"
  | "home.arena.body"
  | "home.council.title"
  | "home.council.body"
  | "home.start"
  | "home.tryPreset"
  | "brief.title"
  | "brief.topic"
  | "brief.context"
  | "brief.depth"
  | "brief.build"
  | "brief.quick"
  | "brief.standard"
  | "brief.deep"
  | "lineup.title"
  | "lineup.subtitle"
  | "lineup.start"
  | "lineup.regenerate"
  | "lineup.model"
  | "lineup.prompt"
  | "lineup.diversity"
  | "lineup.diversityHint"
  | "lineup.addModel"
  | "lineup.autoAssign"
  | "lineup.optimized"
  | "lineup.noExtraModels"
  | "lineup.failurePolicy"
  | "lineup.failurePolicyHint"
  | "lineup.fallbackBalanced"
  | "lineup.fallbackConservative"
  | "lineup.fallbackFast"
  | "session.running"
  | "session.completed"
  | "session.stop"
  | "session.stopping"
  | "session.result"
  | "result.title"
  | "result.downloadPoster"
  | "result.downloadFailed"
  | "result.copyMarkdown"
  | "result.exportJson"
  | "result.newRound"
  | "result.actions"
  | "result.risks"
  | "result.minority"
  | "result.shareTitle"
  | "result.videoScript"
  | "result.copyShareTitle"
  | "result.copyVideoScript"
  | "result.manualCopy"
  | "result.privacy"
  | "result.hideQuestion"
  | "result.hideBackground"
  | "result.conclusionOnly"
  | "result.redactSensitive"
  | "result.saved"
  | "result.copied"
  | "result.copyFailed"
  | "result.exported"
  | "connections.title"
  | "connections.subtitle"
  | "connections.add"
  | "connections.test"
  | "connections.fetchModels"
  | "connections.save"
  | "connections.delete"
  | "connections.protocol"
  | "connections.name"
  | "connections.baseUrl"
  | "connections.apiKey"
  | "connections.model"
  | "connections.headers"
  | "connections.headersHelp"
  | "connections.keyRequired"
  | "connections.requiredTitle"
  | "connections.requiredBody"
  | "connections.closeSetup"
  | "connections.emptyTitle"
  | "connections.emptyBody"
  | "connections.unsupported"
  | "connections.headersInvalid"
  | "connections.presets"
  | "connections.openaiPreset"
  | "connections.openaiResponsesPreset"
  | "connections.deepseekPreset"
  | "connections.anthropicPreset"
  | "connections.geminiPreset"
  | "connections.ollamaPreset"
  | "connections.openrouterPreset"
  | "connections.relayPreset"
  | "connections.customJsonPreset"
  | "connections.corsHint"
  | "connections.storeKey"
  | "connections.modelsLoaded"
  | "privacy.localData"
  | "privacy.clearAll"
  | "privacy.clearAllHint"
  | "privacy.cleared"
  | "history.title"
  | "history.empty"
  | "history.clear"
  | "history.delete"
  | "common.back"
  | "common.save"
  | "common.cancel"
  | "common.connected"
  | "common.failed"
  | "common.untested"
  | "common.localOnly"
  | "common.estimatedCalls"
  | "common.cost"
  | "common.language";

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    "app.subtitle":
      "A local-first AI debate room for playful arguments and serious decisions.",
    "nav.home": "Home",
    "nav.connections": "Model Connections",
    "nav.history": "Local History",
    "home.arena.title": "AI Debate Arena",
    "home.arena.body":
      "Fast, sharp, and shareable. Let a small cast argue a hot topic and turn the result into a poster.",
    "home.council.title": "AI Council Room",
    "home.council.body":
      "Structured and careful. Build a role lineup, review risks, and leave with a decision memo.",
    "home.start": "Start",
    "home.tryPreset": "Try preset",
    "brief.title": "Set the question",
    "brief.topic": "Question or topic",
    "brief.context": "Background and constraints",
    "brief.depth": "Discussion depth",
    "brief.build": "Build council",
    "brief.quick": "Quick",
    "brief.standard": "Standard",
    "brief.deep": "Deep",
    "lineup.title": "Council lineup",
    "lineup.subtitle":
      "Roles are generated from the topic. You can edit names, duties, and model seats before the meeting starts.",
    "lineup.start": "Start meeting",
    "lineup.regenerate": "Regenerate roles",
    "lineup.model": "Model seat",
    "lineup.prompt": "Advanced prompt",
    "lineup.diversity": "Council diversity",
    "lineup.diversityHint":
      "More distinct model seats usually create sharper disagreement. Start with one key, then upgrade the roles that matter.",
    "lineup.addModel": "Add model seat",
    "lineup.autoAssign": "Auto-optimize lineup",
    "lineup.optimized": "Model seats optimized.",
    "lineup.noExtraModels": "Add an API key before optimizing the lineup.",
    "lineup.failurePolicy": "Model failure policy",
    "lineup.failurePolicyHint": "Balanced retries once, then records the failed role. Conservative stops later roles. Fast skips failed roles.",
    "lineup.fallbackBalanced": "Balanced",
    "lineup.fallbackConservative": "Conservative",
    "lineup.fallbackFast": "Fast",
    "session.running": "Meeting in progress",
    "session.completed": "Meeting completed",
    "session.stop": "Stop",
    "session.stopping": "Stopping after the current model call.",
    "session.result": "View result",
    "result.title": "Decision output",
    "result.downloadPoster": "Download poster",
    "result.downloadFailed": "Download failed. Please try again.",
    "result.copyMarkdown": "Copy markdown",
    "result.exportJson": "Export JSON",
    "result.newRound": "Start another round",
    "result.actions": "Action plan",
    "result.risks": "Risk watchlist",
    "result.minority": "Minority opinion",
    "result.shareTitle": "Share title",
    "result.videoScript": "Short video script",
    "result.copyShareTitle": "Copy share title",
    "result.copyVideoScript": "Copy short-video script",
    "result.manualCopy": "Copy manually",
    "result.privacy": "Share privacy check",
    "result.hideQuestion": "Hide original question",
    "result.hideBackground": "Hide personal background",
    "result.conclusionOnly": "Share conclusion only",
    "result.redactSensitive": "Redact emails, phones, and amounts",
    "result.saved": "Saved locally",
    "result.copied": "Copied.",
    "result.copyFailed": "Copy failed. Please copy the text manually.",
    "result.exported": "Export file created.",
    "connections.title": "Model connections",
    "connections.subtitle":
      "Configure at least one API key before starting. Add more providers when sharper model disagreement is worth it.",
    "connections.add": "Add connection",
    "connections.test": "Test connection",
    "connections.fetchModels": "Fetch models",
    "connections.save": "Save connection",
    "connections.delete": "Delete",
    "connections.protocol": "Protocol",
    "connections.name": "Name",
    "connections.baseUrl": "Base URL",
    "connections.apiKey": "API key",
    "connections.model": "Model ID",
    "connections.headers": "Custom headers",
    "connections.headersHelp": "Optional JSON object. Secrets are only saved when device storage is enabled.",
    "connections.keyRequired": "Add an API key before starting.",
    "connections.requiredTitle": "API key required",
    "connections.requiredBody": "AI Council now runs only with real model connections. Configure one provider key to continue.",
    "connections.closeSetup": "Close",
    "connections.emptyTitle": "No model key yet",
    "connections.emptyBody": "Add a provider connection with your own API key. Without a key, the council cannot start.",
    "connections.unsupported": "Available",
    "connections.headersInvalid": "Custom headers must be a valid JSON object.",
    "connections.presets": "Quick presets",
    "connections.openaiPreset": "OpenAI official",
    "connections.openaiResponsesPreset": "OpenAI Responses",
    "connections.deepseekPreset": "DeepSeek official",
    "connections.anthropicPreset": "Anthropic",
    "connections.geminiPreset": "Gemini",
    "connections.ollamaPreset": "Ollama local",
    "connections.openrouterPreset": "OpenRouter / relay",
    "connections.relayPreset": "Custom relay",
    "connections.customJsonPreset": "Custom JSON",
    "connections.corsHint":
      "If the browser blocks CORS, use your own Worker, Function, local proxy, or relay endpoint. Local Ollama may need OLLAMA_ORIGINS.",
    "connections.storeKey": "Save key on this device",
    "connections.modelsLoaded": "Models loaded.",
    "privacy.localData": "Local data",
    "privacy.clearAll": "Clear all local data",
    "privacy.clearAllHint":
      "Removes local history, saved model connections, saved keys, and language preference from this browser.",
    "privacy.cleared": "All local data was cleared.",
    "history.title": "Local history",
    "history.empty": "No saved sessions yet.",
    "history.clear": "Clear all local history",
    "history.delete": "Delete",
    "common.back": "Back",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.connected": "Connected",
    "common.failed": "Failed",
    "common.untested": "Untested",
    "common.localOnly": "Stored only in this browser.",
    "common.estimatedCalls": "Estimated calls",
    "common.cost": "Cost",
    "common.language": "Language",
  },
  zh: {
    "app.subtitle": "一个本地优先的 AI 圆桌：既能吵得好看，也能认真决策。",
    "nav.home": "首页",
    "nav.connections": "模型连接",
    "nav.history": "本地历史",
    "home.arena.title": "AI 吵架场",
    "home.arena.body":
      "短、快、有冲突。让一组 AI 角色围绕热点开吵，并生成可分享海报。",
    "home.council.title": "AI 智囊室",
    "home.council.body":
      "更稳、更结构化。组建角色阵容，审查风险，最终输出决策备忘录。",
    "home.start": "开始",
    "home.tryPreset": "试试预置题",
    "brief.title": "设置问题",
    "brief.topic": "问题或话题",
    "brief.context": "背景和限制条件",
    "brief.depth": "讨论深度",
    "brief.build": "组建智囊团",
    "brief.quick": "快速",
    "brief.standard": "标准",
    "brief.deep": "深度",
    "lineup.title": "智囊团阵容",
    "lineup.subtitle":
      "角色会根据话题自动生成。开始前，你可以编辑名称、职责和模型席位。",
    "lineup.start": "开始会议",
    "lineup.regenerate": "换一批角色",
    "lineup.model": "模型席位",
    "lineup.prompt": "高级提示词",
    "lineup.diversity": "智囊团多样性",
    "lineup.diversityHint":
      "更多不同模型席位通常会带来更尖锐的分歧。先用一个 Key 起步，再逐步升级关键角色。",
    "lineup.addModel": "添加模型席位",
    "lineup.autoAssign": "自动优化阵容",
    "lineup.optimized": "模型席位已优化。",
    "lineup.noExtraModels": "先配置 API Key，再优化阵容。",
    "lineup.failurePolicy": "模型失败策略",
    "lineup.failurePolicyHint": "平衡模式会先重试一次，再记录失败角色；保守模式停止后续角色；快速模式跳过失败角色。",
    "lineup.fallbackBalanced": "平衡",
    "lineup.fallbackConservative": "保守",
    "lineup.fallbackFast": "快速",
    "session.running": "会议进行中",
    "session.completed": "会议已完成",
    "session.stop": "停止",
    "session.stopping": "会在当前模型调用结束后停止。",
    "session.result": "查看结果",
    "result.title": "决策输出",
    "result.downloadPoster": "下载海报",
    "result.downloadFailed": "下载失败，请再试一次。",
    "result.copyMarkdown": "复制 Markdown",
    "result.exportJson": "导出 JSON",
    "result.newRound": "再开一局",
    "result.actions": "行动计划",
    "result.risks": "风险清单",
    "result.minority": "少数派意见",
    "result.shareTitle": "分享标题",
    "result.videoScript": "短视频脚本",
    "result.copyShareTitle": "复制分享标题",
    "result.copyVideoScript": "复制短视频脚本",
    "result.manualCopy": "手动复制内容",
    "result.privacy": "分享前隐私检查",
    "result.hideQuestion": "隐藏原始问题",
    "result.hideBackground": "隐藏个人背景",
    "result.conclusionOnly": "只分享结论",
    "result.redactSensitive": "移除邮箱、电话和金额",
    "result.saved": "已保存到本地",
    "result.copied": "已复制。",
    "result.copyFailed": "复制失败，请手动复制文本。",
    "result.exported": "导出文件已生成。",
    "connections.title": "模型连接",
    "connections.subtitle":
      "开始前至少配置一个 API Key。需要更尖锐的模型分歧时，再逐步添加更多供应商。",
    "connections.add": "添加连接",
    "connections.test": "测试连接",
    "connections.fetchModels": "获取模型",
    "connections.save": "保存连接",
    "connections.delete": "删除",
    "connections.protocol": "连接协议",
    "connections.name": "名称",
    "connections.baseUrl": "Base URL",
    "connections.apiKey": "API Key",
    "connections.model": "模型 ID",
    "connections.headers": "自定义 Headers",
    "connections.headersHelp": "可选 JSON 对象。只有开启本设备保存时，密钥类字段才会持久保存。",
    "connections.keyRequired": "请先配置 API Key，再开始使用。",
    "connections.requiredTitle": "需要配置 API Key",
    "connections.requiredBody": "AI Council 现在只使用真实模型连接。请先配置一个供应商 Key，才能继续。",
    "connections.closeSetup": "关闭",
    "connections.emptyTitle": "还没有模型 Key",
    "connections.emptyBody": "添加一个带自己 API Key 的供应商连接。没有 Key 时，智囊团不能开始。",
    "connections.unsupported": "已支持",
    "connections.headersInvalid": "自定义 Headers 必须是合法 JSON 对象。",
    "connections.presets": "快速预设",
    "connections.openaiPreset": "OpenAI 官方",
    "connections.openaiResponsesPreset": "OpenAI Responses",
    "connections.deepseekPreset": "DeepSeek 官方",
    "connections.anthropicPreset": "Anthropic",
    "connections.geminiPreset": "Gemini",
    "connections.ollamaPreset": "Ollama 本地",
    "connections.openrouterPreset": "OpenRouter / 中转",
    "connections.relayPreset": "自定义中转",
    "connections.customJsonPreset": "自定义 JSON",
    "connections.corsHint":
      "如果浏览器被 CORS 拦截，请使用自己的 Worker、Function、本地代理或中转端点。本地 Ollama 可能需要配置 OLLAMA_ORIGINS。",
    "connections.storeKey": "在本设备保存 Key",
    "connections.modelsLoaded": "模型列表已获取。",
    "privacy.localData": "本地数据",
    "privacy.clearAll": "清空所有本地数据",
    "privacy.clearAllHint":
      "会从当前浏览器移除本地历史、已保存模型连接、已保存 Key 和语言偏好。",
    "privacy.cleared": "所有本地数据已清空。",
    "history.title": "本地历史",
    "history.empty": "还没有保存的会议。",
    "history.clear": "清空本地历史",
    "history.delete": "删除",
    "common.back": "返回",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.connected": "已连接",
    "common.failed": "失败",
    "common.untested": "未测试",
    "common.localOnly": "仅保存在当前浏览器。",
    "common.estimatedCalls": "预计调用",
    "common.cost": "成本",
    "common.language": "语言",
  },
};
