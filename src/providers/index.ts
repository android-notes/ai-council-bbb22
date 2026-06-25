import type { ModelRequest } from "./types";
import type { ModelConnection } from "../types";
import { askMockModel, testMockConnection } from "./mockProvider";
import {
  askAnthropicMessages,
  fetchAnthropicModels,
  testAnthropicMessagesConnection,
} from "./anthropicMessages";
import {
  askCustomJson,
  fetchCustomJsonModels,
  testCustomJsonConnection,
} from "./customJson";
import { askGemini, fetchGeminiModels, testGeminiConnection } from "./gemini";
import { askOllama, fetchOllamaModels, testOllamaConnection } from "./ollama";
import {
  askOpenAiCompatible,
  fetchOpenAiCompatibleModels,
  testOpenAiCompatibleConnection,
} from "./openAiCompatible";
import {
  askOpenAiResponses,
  fetchOpenAiResponsesModels,
  testOpenAiResponsesConnection,
} from "./openAiResponses";

export async function askModel(request: ModelRequest) {
  if (request.connection.protocol === "mock") {
    return askMockModel(request);
  }

  if (request.connection.protocol === "openai-chat-completions") {
    return askOpenAiCompatible(request);
  }

  if (request.connection.protocol === "openai-responses") {
    return askOpenAiResponses(request);
  }

  if (request.connection.protocol === "anthropic-messages") {
    return askAnthropicMessages(request);
  }

  if (request.connection.protocol === "gemini") {
    return askGemini(request);
  }

  if (request.connection.protocol === "ollama") {
    return askOllama(request);
  }

  if (request.connection.protocol === "custom") {
    return askCustomJson(request);
  }

  const exhaustive: never = request.connection.protocol;
  throw new Error(`Unsupported protocol: ${exhaustive}`);
}

export async function testModelConnection(connection: ModelConnection) {
  if (connection.protocol === "mock") {
    return testMockConnection();
  }

  if (connection.protocol === "openai-chat-completions") {
    return testOpenAiCompatibleConnection(connection);
  }

  if (connection.protocol === "openai-responses") {
    return testOpenAiResponsesConnection(connection);
  }

  if (connection.protocol === "anthropic-messages") {
    return testAnthropicMessagesConnection(connection);
  }

  if (connection.protocol === "gemini") {
    return testGeminiConnection(connection);
  }

  if (connection.protocol === "ollama") {
    return testOllamaConnection(connection);
  }

  if (connection.protocol === "custom") {
    return testCustomJsonConnection(connection);
  }

  const exhaustive: never = connection.protocol;
  return {
    ok: false,
    status: "failed" as const,
    message: `Unsupported protocol: ${exhaustive}`,
  };
}

export async function fetchModelList(connection: ModelConnection) {
  if (connection.protocol === "openai-chat-completions") {
    return fetchOpenAiCompatibleModels(connection);
  }

  if (connection.protocol === "openai-responses") {
    return fetchOpenAiResponsesModels(connection);
  }

  if (connection.protocol === "anthropic-messages") {
    return fetchAnthropicModels(connection);
  }

  if (connection.protocol === "gemini") {
    return fetchGeminiModels(connection);
  }

  if (connection.protocol === "ollama") {
    return fetchOllamaModels(connection);
  }

  if (connection.protocol === "custom") {
    return fetchCustomJsonModels(connection);
  }

  if (connection.protocol === "mock") {
    return {
      ok: true,
      models: [connection.model],
      message: "Mock model loaded.",
    };
  }

  const exhaustive: never = connection.protocol;
  return {
    ok: false,
    models: [],
    message: `Unsupported protocol: ${exhaustive}`,
  };
}
