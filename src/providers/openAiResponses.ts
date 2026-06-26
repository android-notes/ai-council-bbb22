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

export async function askOpenAiResponses(request: ModelRequest): Promise<ModelResponse> {
  const response = await fetchWithTimeout(buildResponsesEndpoint(request.connection.baseUrl), {
    method: "POST",
    headers: buildBearerHeaders(request.connection),
    body: JSON.stringify({
      model: request.connection.model,
      instructions: buildSystemPrompt(request),
      input: buildUserPrompt(request),
      temperature: request.mode === "review" ? 0.85 : 0.45,
      max_output_tokens: request.maxOutputTokens,
      stream: false,
    }),
  });

  const json = await safeJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(json, response.status));
  }

  const content = extractTextFromUnknown(json);
  if (!content.trim()) {
    throw new Error("Protocol mismatch: response did not contain text output.");
  }

  return { content, raw: json };
}

export async function testOpenAiResponsesConnection(
  connection: ModelConnection
): Promise<ConnectionTestResult> {
  const startedAt = performance.now();

  try {
    const response = await fetchWithTimeout(buildResponsesEndpoint(connection.baseUrl), {
      method: "POST",
      headers: buildBearerHeaders(connection),
      body: JSON.stringify({
        model: connection.model,
        input: "Reply with exactly: ok",
        max_output_tokens: 16,
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
        message: "Protocol mismatch: response did not contain text output.",
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

export async function fetchOpenAiResponsesModels(
  connection: ModelConnection
): Promise<ModelListResult> {
  try {
    const response = await fetchWithTimeout(buildResponsesModelsEndpoint(connection.baseUrl), {
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

function buildResponsesEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/responses")) {
    return trimmed;
  }

  return `${trimmed}/responses`;
}

function buildResponsesModelsEndpoint(baseUrl: string) {
  const trimmed = trimBaseUrl(baseUrl);
  if (trimmed.endsWith("/models")) {
    return trimmed;
  }

  if (trimmed.endsWith("/responses")) {
    return trimmed.replace(/\/responses$/, "/models");
  }

  return `${trimmed}/models`;
}
