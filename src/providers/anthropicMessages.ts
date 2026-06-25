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
  extractModelIds,
  extractTextFromUnknown,
  networkErrorMessage,
  safeJson,
  trimBaseUrl,
} from "./shared";

export async function askAnthropicMessages(request: ModelRequest): Promise<ModelResponse> {
  const response = await fetch(buildMessagesEndpoint(request.connection.baseUrl), {
    method: "POST",
    headers: buildAnthropicHeaders(request.connection),
    body: JSON.stringify({
      model: request.connection.model,
      system: buildSystemPrompt(request),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(request),
        },
      ],
      temperature: request.mode === "arena" ? 0.85 : 0.45,
      max_tokens: request.maxOutputTokens,
      stream: false,
    }),
  });

  const json = await safeJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(json, response.status));
  }

  const content = extractTextFromUnknown(json);
  if (!content.trim()) {
    throw new Error("Protocol mismatch: response did not contain Anthropic content text.");
  }

  return { content, raw: json };
}

export async function testAnthropicMessagesConnection(
  connection: ModelConnection
): Promise<ConnectionTestResult> {
  const startedAt = performance.now();

  try {
    const response = await fetch(buildMessagesEndpoint(connection.baseUrl), {
      method: "POST",
      headers: buildAnthropicHeaders(connection),
      body: JSON.stringify({
        model: connection.model,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: ok",
          },
        ],
        max_tokens: 16,
        temperature: 0,
        stream: false,
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
        message: "Protocol mismatch: response did not contain Anthropic content text.",
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

export async function fetchAnthropicModels(
  connection: ModelConnection
): Promise<ModelListResult> {
  try {
    const response = await fetch(buildModelsEndpoint(connection.baseUrl), {
      method: "GET",
      headers: buildAnthropicHeaders(connection),
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
          : "No models were returned by this endpoint.",
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

function buildAnthropicHeaders(connection: ModelConnection) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };

  if (connection.apiKey) {
    headers["x-api-key"] = connection.apiKey;
  }

  return {
    ...headers,
    ...(connection.customHeaders ?? {}),
  };
}

function buildMessagesEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/messages")) {
    return trimmed;
  }

  return `${trimmed}/messages`;
}

function buildModelsEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/models")) {
    return trimmed;
  }

  if (trimmed.endsWith("/messages")) {
    return trimmed.replace(/\/messages$/, "/models");
  }

  return `${trimmed}/models`;
}
