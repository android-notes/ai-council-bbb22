import type { ConnectionTestResult, ModelRequest, ModelResponse } from "./types";
import type { ModelConnection } from "../types";

export async function askOpenAiCompatible(
  request: ModelRequest
): Promise<ModelResponse> {
  const endpoint = buildChatCompletionsEndpoint(request.connection.baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: buildHeaders(request.connection),
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
      temperature: request.mode === "arena" ? 0.85 : 0.45,
      max_tokens: request.maxOutputTokens,
      stream: false,
    }),
  });

  const json = await safeJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(json, response.status));
  }

  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Protocol mismatch: missing choices[0].message.content.");
  }

  return { content, raw: json };
}

export async function testOpenAiCompatibleConnection(
  connection: ModelConnection
): Promise<ConnectionTestResult> {
  const startedAt = performance.now();

  try {
    const endpoint = buildChatCompletionsEndpoint(connection.baseUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: buildHeaders(connection),
      body: JSON.stringify({
        model: connection.model,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: ok",
          },
        ],
        max_tokens: 8,
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

    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return {
        ok: false,
        status: "failed",
        message: "Protocol mismatch: response did not match Chat Completions.",
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }

    const streamingSupported = await probeStreaming(connection);

    return {
      ok: true,
      status: "connected",
      message: streamingSupported
        ? "Connection test succeeded. Streaming is supported."
        : "Connection test succeeded. Streaming was not detected, so normal responses will be used.",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      message:
        error instanceof TypeError
          ? "Network or CORS blocked the request."
          : error instanceof Error
            ? error.message
            : "Unknown connection error.",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

async function probeStreaming(connection: ModelConnection) {
  try {
    const endpoint = buildChatCompletionsEndpoint(connection.baseUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: buildHeaders(connection),
      body: JSON.stringify({
        model: connection.model,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: ok",
          },
        ],
        max_tokens: 8,
        temperature: 0,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      return false;
    }

    const reader = response.body.getReader();
    const chunk = await reader.read();
    await reader.cancel();
    return Boolean(chunk.value);
  } catch {
    return false;
  }
}

function buildChatCompletionsEndpoint(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }

  return `${trimmed}/chat/completions`;
}

function buildHeaders(connection: ModelConnection) {
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

function buildSystemPrompt(request: ModelRequest) {
  const languageName = request.language === "zh" ? "Simplified Chinese" : "English";
  return [
    `You are ${request.role.name}.`,
    request.role.prompt,
    `Respond in ${languageName}.`,
    "Stay inside your role. Be concise, concrete, and avoid pretending to know facts not supplied by the user.",
  ].join("\n");
}

function buildUserPrompt(request: ModelRequest) {
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

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractErrorMessage(json: unknown, status: number) {
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
