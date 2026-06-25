import type { ModelConnection } from "../types";
import type { ModelRequest } from "./types";

export async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function extractErrorMessage(json: unknown, status: number) {
  if (
    json &&
    typeof json === "object" &&
    "error" in json &&
    json.error &&
    typeof json.error === "object" &&
    "message" in json.error &&
    typeof json.error.message === "string"
  ) {
    return json.error.message;
  }

  return `Request failed with HTTP ${status}.`;
}

export function networkErrorMessage(scope = "request") {
  return `Network or CORS blocked the ${scope}.`;
}

export function trimBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function buildBearerHeaders(connection: ModelConnection) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (connection.apiKey) {
    headers.Authorization = `Bearer ${connection.apiKey}`;
  }

  return {
    ...headers,
    ...(connection.customHeaders ?? {}),
  };
}

export function extractModelIds(json: unknown) {
  if (!json || typeof json !== "object") {
    return [];
  }

  const maybeData = "data" in json ? json.data : undefined;
  const maybeModels = "models" in json ? json.models : undefined;
  const source = Array.isArray(maybeData)
    ? maybeData
    : Array.isArray(maybeModels)
      ? maybeModels
      : [];

  return source
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (!item || typeof item !== "object") {
        return "";
      }

      if ("id" in item && typeof item.id === "string") {
        return item.id;
      }

      if ("name" in item && typeof item.name === "string") {
        return item.name.replace(/^models\//, "");
      }

      if ("model" in item && typeof item.model === "string") {
        return item.model;
      }

      return "";
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function buildSystemPrompt(request: ModelRequest) {
  const languageName = request.language === "zh" ? "Simplified Chinese" : "English";
  return [
    `You are ${request.role.name}.`,
    request.role.prompt,
    `Respond in ${languageName}.`,
    "Stay inside your role. Be concise, concrete, and avoid pretending to know facts not supplied by the user.",
  ].join("\n");
}

export function buildUserPrompt(request: ModelRequest) {
  const prior = request.previousMessages
    .slice(-6)
    .map((message) => `${message.roleName}: ${message.content}`)
    .join("\n");

  return [
    `Mode: ${request.mode}`,
    `Stage: ${request.stage}`,
    `Topic: ${request.topic}`,
    `Context: ${request.context || "No extra context provided."}`,
    prior ? `Recent discussion:\n${prior}` : "",
    stageInstruction(request),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function extractTextFromUnknown(json: unknown): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  if ("output_text" in json && typeof json.output_text === "string") {
    return json.output_text;
  }

  if ("content" in json) {
    const content = extractContentValue(json.content);
    if (content) return content;
  }

  if ("text" in json && typeof json.text === "string") {
    return json.text;
  }

  if ("response" in json && typeof json.response === "string") {
    return json.response;
  }

  if ("message" in json && json.message && typeof json.message === "object") {
    const message = json.message as Record<string, unknown>;
    if ("content" in message) {
      const content = extractContentValue(message.content);
      if (content) return content;
    }
  }

  if ("choices" in json && Array.isArray(json.choices)) {
    const first = json.choices[0];
    if (first && typeof first === "object") {
      if ("message" in first && first.message && typeof first.message === "object") {
        const message = first.message as Record<string, unknown>;
        if ("content" in message) {
          const content = extractContentValue(message.content);
          if (content) return content;
        }
      }

      if ("text" in first && typeof first.text === "string") {
        return first.text;
      }
    }
  }

  if ("candidates" in json && Array.isArray(json.candidates)) {
    const first = json.candidates[0];
    if (first && typeof first === "object" && "content" in first) {
      const content = first.content;
      if (content && typeof content === "object" && "parts" in content && Array.isArray(content.parts)) {
        const parts: unknown[] = content.parts;
        return parts
          .map((part) =>
            part && typeof part === "object" && "text" in part && typeof part.text === "string"
              ? part.text
              : ""
          )
          .filter(Boolean)
          .join("\n");
      }
    }
  }

  if ("output" in json && Array.isArray(json.output)) {
    return json.output
      .map((item) => {
        if (!item || typeof item !== "object" || !("content" in item)) {
          return "";
        }
        return extractContentValue(item.content);
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractContentValue(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }

      if (!block || typeof block !== "object") {
        return "";
      }

      if ("text" in block && typeof block.text === "string") {
        return block.text;
      }

      if ("content" in block && typeof block.content === "string") {
        return block.content;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function stageInstruction(request: ModelRequest) {
  if (request.stage === "summary") {
    return [
      "Synthesize the council into a compact final memo.",
      "Include: verdict, strongest support, strongest objection, actions, risks, and minority opinion.",
      "Use short labeled sections or bullets so the UI can turn the answer into a poster and memo.",
    ].join(" ");
  }

  if (request.stage === "vote") {
    return "Vote with a clear stance, confidence level, and one decisive reason.";
  }

  if (request.stage === "riskReview") {
    return "Name the highest-risk assumptions, failure signals, and reversible next steps.";
  }

  if (request.stage === "crossExam") {
    return "Ask or answer the hardest question for another role. Be specific and adversarial but fair.";
  }

  if (request.mode === "arena") {
    return "Give one sharp, memorable contribution for this stage. Keep it concrete and shareable.";
  }

  return "Give one useful contribution for this stage. State assumptions, evidence gaps, and next-step implications.";
}
