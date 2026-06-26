export interface RelayEnv {
  ALLOWED_ORIGINS?: string;
  RELAY_TOKEN?: string;
}

type RelayOptions = {
  pathPrefix?: string;
};

const PROVIDERS: Record<string, string> = {
  anthropic: "https://api.anthropic.com",
  deepseek: "https://api.deepseek.com",
  gemini: "https://generativelanguage.googleapis.com",
  openai: "https://api.openai.com",
  openrouter: "https://openrouter.ai",
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://android-notes.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
];

const CORS_ALLOWED_HEADERS = [
  "authorization",
  "content-type",
  "x-api-key",
  "x-goog-api-key",
  "anthropic-version",
  "openai-organization",
  "openai-project",
  "http-referer",
  "x-title",
  "x-ai-council-relay-token",
];

const HOP_BY_HOP_HEADERS = new Set([
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "connection",
  "content-length",
  "host",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-forwarded-for",
  "x-forwarded-proto",
]);

export async function handleRelayRequest(
  request: Request,
  env: RelayEnv = {},
  options: RelayOptions = {}
): Promise<Response> {
  const requestUrl = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env),
    });
  }

  if (isHealthCheck(requestUrl, options)) {
    return jsonResponse(
      {
        ok: true,
        service: "ai-council-relay",
        providers: Object.keys(PROVIDERS),
      },
      request,
      env
    );
  }

  if (!["GET", "POST"].includes(request.method)) {
    return jsonResponse({ error: "Method not allowed." }, request, env, 405);
  }

  const tokenError = validateRelayToken(request, env);
  if (tokenError) {
    return jsonResponse({ error: tokenError }, request, env, 401);
  }

  const route = resolveProviderRoute(requestUrl, options);
  if (!route) {
    return jsonResponse(
      {
        error:
          "Unsupported relay path. Use /openai/*, /deepseek/*, /anthropic/*, /gemini/*, or /openrouter/*.",
      },
      request,
      env,
      404
    );
  }

  const upstreamRequest = new Request(route.url, {
    body: request.method === "GET" ? undefined : request.body,
    headers: forwardHeaders(request.headers),
    method: request.method,
    redirect: "manual",
  });

  const upstreamResponse = await fetch(upstreamRequest);
  const responseHeaders = forwardResponseHeaders(upstreamResponse.headers);
  addCorsHeaders(responseHeaders, request, env);
  responseHeaders.set("x-ai-council-relay-provider", route.provider);

  return new Response(upstreamResponse.body, {
    headers: responseHeaders,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}

function isHealthCheck(requestUrl: URL, options: RelayOptions) {
  const segments = pathSegments(requestUrl, options);
  return segments.length === 0 || (segments.length === 1 && segments[0] === "health");
}

function resolveProviderRoute(requestUrl: URL, options: RelayOptions) {
  const [provider, ...rest] = pathSegments(requestUrl, options);
  const baseUrl = provider ? PROVIDERS[provider] : undefined;
  if (!provider || !baseUrl || rest.length === 0) {
    return undefined;
  }

  const upstream = new URL(baseUrl);
  upstream.pathname = `/${rest.join("/")}`;
  upstream.search = requestUrl.search;

  return { provider, url: upstream.toString() };
}

function pathSegments(requestUrl: URL, options: RelayOptions) {
  const prefix = normalizePrefix(options.pathPrefix);
  let pathname = requestUrl.pathname;

  if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    pathname = pathname.slice(prefix.length) || "/";
  }

  return pathname.split("/").filter(Boolean);
}

function normalizePrefix(prefix?: string) {
  if (!prefix) return "";
  const normalized = `/${prefix.trim().replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "" : normalized;
}

function validateRelayToken(request: Request, env: RelayEnv) {
  if (!env.RELAY_TOKEN) return undefined;

  const token = request.headers.get("x-ai-council-relay-token");
  return token === env.RELAY_TOKEN ? undefined : "Relay token is missing or invalid.";
}

function forwardHeaders(headers: Headers) {
  const nextHeaders = new Headers();

  headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized)) return;
    if (normalized === "origin") return;
    nextHeaders.set(key, value);
  });

  return nextHeaders;
}

function forwardResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers();

  headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized)) return;
    if (normalized === "content-encoding") return;
    if (normalized === "access-control-allow-origin") return;
    if (normalized === "access-control-allow-headers") return;
    if (normalized === "access-control-allow-methods") return;
    nextHeaders.set(key, value);
  });

  return nextHeaders;
}

function jsonResponse(
  payload: Record<string, unknown>,
  request: Request,
  env: RelayEnv,
  status = 200
) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...Object.fromEntries(corsHeaders(request, env)),
    },
    status,
  });
}

function corsHeaders(request: Request, env: RelayEnv) {
  const headers = new Headers();
  addCorsHeaders(headers, request, env);
  return headers;
}

function addCorsHeaders(headers: Headers, request: Request, env: RelayEnv) {
  const origin = request.headers.get("origin");
  const allowedOrigin = resolveAllowedOrigin(origin, env);

  headers.set("access-control-allow-origin", allowedOrigin);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", CORS_ALLOWED_HEADERS.join(", "));
  headers.set("access-control-max-age", "86400");
  headers.set("vary", "Origin");
}

function resolveAllowedOrigin(origin: string | null, env: RelayEnv) {
  const allowedOrigins = (env.ALLOWED_ORIGINS?.split(",") ?? DEFAULT_ALLOWED_ORIGINS)
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowedOrigins.includes("*")) {
    return "*";
  }

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  return allowedOrigins[0] ?? "https://android-notes.github.io";
}
