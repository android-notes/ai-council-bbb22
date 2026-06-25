import type { Language } from "../types";
import { translations, type TranslationKey } from "./translations";

const supported: Language[] = ["en", "zh"];

export function detectLanguage(): Language {
  const saved = window.localStorage.getItem("ai-council-language");
  if (saved === "en" || saved === "zh") {
    return saved;
  }

  const browser = navigator.language.toLowerCase();
  if (browser.startsWith("zh")) {
    return "zh";
  }

  return "en";
}

export function persistLanguage(language: Language) {
  window.localStorage.setItem("ai-council-language", language);
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
}

export function nextLanguage(language: Language): Language {
  const index = supported.indexOf(language);
  return supported[(index + 1) % supported.length];
}

export function createTranslator(language: Language) {
  return (key: TranslationKey) => translations[language][key] ?? key;
}
