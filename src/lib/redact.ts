export function redactSensitiveText(text: string) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted phone]")
    .replace(/\b\d{2,}(,\d{3})*(\.\d+)?\s*(元|人民币|rmb|usd|dollars?|万|k)?\b/gi, "[redacted amount]");
}
