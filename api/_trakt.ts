const TRAKT_BASE_URL = "https://api.trakt.tv";
const TRAKT_USER_AGENT =
  "betaseries-to-trakt/1.0 (+https://github.com/AlexisAnzieu/betaseries-to-trakt)";

interface TraktResponse<T> {
  status: number;
  body: T | string;
  headers: Headers;
}

const parseResponseBody = async <T>(
  response: Response
): Promise<T | string> => {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (!raw) {
    return "";
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw;
    }
  }

  return raw;
};

const toTraktResponse = async <T>(
  response: Response
): Promise<TraktResponse<T>> => {
  const body = await parseResponseBody<T>(response);

  if (response.status >= 400) {
    console.warn("[trakt] Request failed", {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyPreview: typeof body === "string" ? body.slice(0, 200) : body,
    });
  }

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const applyCors = (setHeader: (name: string, value: string) => void) => {
  for (const [name, value] of Object.entries(corsHeaders)) {
    setHeader(name, value);
  }
};

export const requestTraktDeviceCode = async <T = unknown>(
  clientId: string
): Promise<TraktResponse<T>> => {
  const response = await fetch(`${TRAKT_BASE_URL}/oauth/device/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": TRAKT_USER_AGENT,
      "trakt-api-version": "2",
      "trakt-api-key": clientId,
    },
    body: JSON.stringify({ client_id: clientId }),
  });

  return toTraktResponse<T>(response);
};

export const exchangeTraktDeviceCode = async <T = unknown>(
  clientId: string,
  clientSecret: string,
  deviceCode: string
): Promise<TraktResponse<T>> => {
  const response = await fetch(`${TRAKT_BASE_URL}/oauth/device/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": TRAKT_USER_AGENT,
      "trakt-api-version": "2",
      "trakt-api-key": clientId,
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: deviceCode,
    }),
  });

  return toTraktResponse<T>(response);
};
