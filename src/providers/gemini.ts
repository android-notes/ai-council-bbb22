import type { ModelConnection } from "../types";
import type {
  ConnectionTestResult,
  ModelListResult,
  ModelRequest,
  ModelResponse,
} from "./types";
import {
  buildSystemPrompt,
  buildUserPrompt,
  extractErrorMessage,
  fetchWithTimeout,
  networkErrorMessage,
  safeJson,
  trimBaseUrl,
} from "./shared";

export async function askGemini(request: ModelRequest): Promise<ModelResponse> {
  const response = await fetchWithTimeout(buildGenerateContentEndpoint(request.connection), {
    method: "POST",
    headers: buildGeminiHeaders(request.connection),
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemPrompt(request) }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildUserPrompt(request) }],
        },
      ],
      generationConfig: {
        temperature: request.mode === "review" ? 0.85 : 0.45,
        maxOutputTokens: request.maxOutputTokens,
      },
    }),
  });

  const json = await safeJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(json, response.status));
  }

  const content = extractGeminiText(json);
  if (!content.trim()) {
    throw new Error("Protocol mismatch: response did not contain Gemini candidate text.");
  }

  return { content, raw: json };
}

export async function testGeminiConnection(connection: ModelConnection): Promise<ConnectionTestResult> {
  const startedAt = performance.now();

  try {
    const response = await fetchWithTimeout(buildGenerateContentEndpoint(connection), {
      method: "POST",
      headers: buildGeminiHeaders(connection),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Reply with exactly: ok" }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 16,
        },
      }),
    });
    const json = await safeJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: "failed",
        message: extractErrorMessage(json, response.status),
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }

    if (!extractGeminiText(json)) {
      return {
        ok: false,
        status: "failed",
        message: "Protocol mismatch: response did not contain Gemini candidate text.",
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }

    return {
      ok: true,
      status: "connected",
      message: "Connection test succeeded.",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      message:
        error instanceof TypeError
          ? networkErrorMessage()
          : error instanceof Error
            ? error.message
            : "Unknown connection error.",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

export async function fetchGeminiModels(connection: ModelConnection): Promise<ModelListResult> {
  try {
    const response = await fetchWithTimeout(buildModelsEndpoint(connection.baseUrl), {
      method: "GET",
      headers: buildGeminiHeaders(connection),
    });
    const json = await safeJson(response);

    if (!response.ok) {
      return {
        ok: false,
        models: [],
        message: extractErrorMessage(json, response.status),
      };
    }

    const models = extractGeminiModels(json);
    return {
      ok: models.length > 0,
      models,
      message:
        models.length > 0
          ? `${models.length} models loaded.`
          : "No Gemini generateContent models were returned.",
    };
  } catch (error) {
    return {
      ok: false,
      models: [],
      message:
        error instanceof TypeError
          ? networkErrorMessage("models request")
          : error instanceof Error
            ? error.message
            : "Unknown models request error.",
    };
  }
}

function buildGeminiHeaders(connection: ModelConnection) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (connection.apiKey) {
    headers["x-goog-api-key"] = connection.apiKey;
  }

  return {
    ...headers,
    ...(connection.customHeaders ?? {}),
  };
}

function buildGenerateContentEndpoint(connection: ModelConnection) {
  const trimmed = trimBaseUrl(connection.baseUrl);
  if (trimmed.endsWith(":generateContent")) {
    return trimmed;
  }

  if (/\/models\/[^/]+$/.test(trimmed)) {
    return `${trimmed}:generateContent`;
  }

  return `${trimmed}/models/${encodeURIComponent(connection.model)}:generateContent`;
}

function buildModelsEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/models")) {
    return trimmed;
  }

  const modelMatch = trimmed.match(/(.+)\/models\/[^/]+(?::generateContent)?$/);
  if (modelMatch?.[1]) {
    return `${modelMatch[1]}/models`;
  }

  return `${trimmed}/models`;
}

function extractGeminiText(json: unknown) {
  if (!json || typeof json !== "object" || !("candidates" in json) || !Array.isArray(json.candidates)) {
    return "";
  }

  return json.candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || !("content" in candidate)) {
        return [];
      }
      const content = candidate.content;
      if (!content || typeof content !== "object" || !("parts" in content) || !Array.isArray(content.parts)) {
        return [];
      }
      const parts: unknown[] = content.parts;
      return parts.map((part) =>
        part && typeof part === "object" && "text" in part && typeof part.text === "string"
          ? part.text
          : ""
      );
    })
    .filter(Boolean)
    .join("\n");
}

function extractGeminiModels(json: unknown) {
  if (!json || typeof json !== "object" || !("models" in json) || !Array.isArray(json.models)) {
    return [];
  }

  return json.models
    .filter((model) => {
      if (!model || typeof model !== "object" || !("supportedGenerationMethods" in model)) {
        return true;
      }
      return (
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent")
      );
    })
    .map((model) => {
      if (!model || typeof model !== "object" || !("name" in model) || typeof model.name !== "string") {
        return "";
      }
      return model.name.replace(/^models\//, "");
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
