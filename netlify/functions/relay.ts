import { handleRelayRequest, type RelayEnv } from "../../relay/relay";

export default function handler(request: Request): Promise<Response> {
  return handleRelayRequest(request, readNetlifyEnv(), { pathPrefix: "/api" });
}

export const config = {
  path: ["/api/health", "/api/:provider/*"],
  method: ["GET", "POST", "OPTIONS"],
};

function readNetlifyEnv(): RelayEnv {
  const runtime = globalThis as typeof globalThis & {
    Netlify?: { env?: { get(name: string): string | undefined } };
  };

  return {
    ALLOWED_ORIGINS: runtime.Netlify?.env?.get("ALLOWED_ORIGINS"),
    RELAY_TOKEN: runtime.Netlify?.env?.get("RELAY_TOKEN"),
  };
}
