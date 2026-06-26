import type { ModelConnection } from "../types";
import type {
  ConnectionTestResult,
  ModelListResult,
  ModelRequest,
  ModelResponse,
} from "./types";
import {
  askOpenAiCompatible,
  fetchOpenAiCompatibleModels,
  testOpenAiCompatibleConnection,
} from "./openAiCompatible";
import {
  buildBearerHeaders,
  buildSystemPrompt,
  buildUserPrompt,
  extractErrorMessage,
  extractModelIds,
  extractTextFromUnknown,
  fetchWithTimeout,
  networkErrorMessage,
  safeJson,
  trimBaseUrl,
} from "./shared";

export async function askOllama(request: ModelRequest): Promise<ModelResponse> {
  if (looksOpenAiCompatible(request.connection.baseUrl)) {
    return askOpenAiCompatible(request);
  }

  const response = await fetchWithTimeout(buildOllamaChatEndpoint(request.connection.baseUrl), {
    method: "POST",
    headers: buildBearerHeaders(request.connection),
    body: JSON.stringify({
      model: request.connection.model,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(request),
        },
        {
          role: "user",
          content: buildUserPrompt(request),
        },
      ],
      stream: false,
      options: {
        temperature: request.mode === "review" ? 0.85 : 0.45,
        num_predict: request.maxOutputTokens,
      },
    }),
  });

  const json = await safeJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(json, response.status));
  }

  const content = extractTextFromUnknown(json);
  if (!content.trim()) {
    throw new Error("Protocol mismatch: response did not contain Ollama message content.");
  }

  return { content, raw: json };
}

export async function testOllamaConnection(connection: ModelConnection): Promise<ConnectionTestResult> {
  if (looksOpenAiCompatible(connection.baseUrl)) {
    return testOpenAiCompatibleConnection(connection);
  }

  const startedAt = performance.now();

  try {
    const response = await fetchWithTimeout(buildOllamaChatEndpoint(connection.baseUrl), {
      method: "POST",
      headers: buildBearerHeaders(connection),
      body: JSON.stringify({
        model: connection.model,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: ok",
          },
        ],
        stream: false,
        options: {
          temperature: 0,
          num_predict: 16,
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

    if (!extractTextFromUnknown(json)) {
      return {
        ok: false,
        status: "failed",
        message: "Protocol mismatch: response did not contain Ollama message content.",
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

export async function fetchOllamaModels(connection: ModelConnection): Promise<ModelListResult> {
  if (looksOpenAiCompatible(connection.baseUrl)) {
    return fetchOpenAiCompatibleModels(connection);
  }

  try {
    const response = await fetchWithTimeout(buildOllamaTagsEndpoint(connection.baseUrl), {
      method: "GET",
      headers: buildBearerHeaders(connection),
    });
    const json = await safeJson(response);

    if (!response.ok) {
      return {
        ok: false,
        models: [],
        message: extractErrorMessage(json, response.status),
      };
    }

    const models = extractModelIds(json);
    return {
      ok: models.length > 0,
      models,
      message:
        models.length > 0
          ? `${models.length} models loaded.`
          : "No Ollama models were returned by this endpoint.",
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

function buildOllamaChatEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/api/chat")) {
    return trimmed;
  }

  return `${trimmed}/api/chat`;
}

function buildOllamaTagsEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/api/tags")) {
    return trimmed;
  }

  if (trimmed.endsWith("/api/chat")) {
    return trimmed.replace(/\/api\/chat$/, "/api/tags");
  }

  return `${trimmed}/api/tags`;
}

function looksOpenAiCompatible(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  return trimmed.endsWith("/v1") || trimmed.includes("/v1/");
}
