import type { ModelConnection } from "../types";
import type {
  ConnectionTestResult,
  ModelListResult,
  ModelRequest,
  ModelResponse,
} from "./types";
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

export async function askCustomJson(request: ModelRequest): Promise<ModelResponse> {
  const payload = buildCustomPayload(
    request.connection,
    buildSystemPrompt(request),
    buildUserPrompt(request),
    request.mode === "review" ? 0.85 : 0.45,
    request.maxOutputTokens
  );
  const response = await fetchWithTimeout(buildCustomEndpoint(request.connection.baseUrl), {
    method: "POST",
    headers: buildBearerHeaders(request.connection),
    body: JSON.stringify(payload),
  });
  const json = await safeJson(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(json, response.status));
  }

  const content = extractTextFromUnknown(json);
  if (!content.trim()) {
    throw new Error("Protocol mismatch: custom response did not contain readable text.");
  }

  return { content, raw: json };
}

export async function testCustomJsonConnection(
  connection: ModelConnection
): Promise<ConnectionTestResult> {
  const startedAt = performance.now();

  try {
    const response = await fetchWithTimeout(buildCustomEndpoint(connection.baseUrl), {
      method: "POST",
      headers: buildBearerHeaders(connection),
      body: JSON.stringify(
        buildCustomPayload(
          connection,
          "You are a connection test.",
          "Reply with exactly: ok",
          0,
          16
        )
      ),
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
        message: "Protocol mismatch: custom response did not contain readable text.",
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

export async function fetchCustomJsonModels(
  connection: ModelConnection
): Promise<ModelListResult> {
  try {
    const response = await fetchWithTimeout(buildCustomModelsEndpoint(connection.baseUrl), {
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

function buildCustomPayload(
  connection: ModelConnection,
  system: string,
  prompt: string,
  temperature: number,
  maxTokens: number
) {
  return {
    model: connection.model,
    system,
    prompt,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
    max_output_tokens: maxTokens,
    stream: false,
    metadata: {
      app: "ai-council",
      protocol: "custom",
    },
  };
}

function buildCustomEndpoint(baseUrl: string) {
  return trimBaseUrl(baseUrl);
}

function buildCustomModelsEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/models")) {
    return trimmed;
  }

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.replace(/\/chat\/completions$/, "/models");
  }

  if (trimmed.endsWith("/responses")) {
    return trimmed.replace(/\/responses$/, "/models");
  }

  if (trimmed.endsWith("/api/chat")) {
    return trimmed.replace(/\/api\/chat$/, "/api/tags");
  }

  return `${trimmed}/models`;
}
