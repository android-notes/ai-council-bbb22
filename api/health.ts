import { handleRelayRequest, type RelayEnv } from "../relay/relay";

export const config = {
  runtime: "edge",
};

export default function handler(request: Request): Promise<Response> {
  return handleRelayRequest(request, readVercelEnv(), { pathPrefix: "/api" });
}

function readVercelEnv(): RelayEnv {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return {
    ALLOWED_ORIGINS: runtime.process?.env?.ALLOWED_ORIGINS,
    RELAY_TOKEN: runtime.process?.env?.RELAY_TOKEN,
  };
}
