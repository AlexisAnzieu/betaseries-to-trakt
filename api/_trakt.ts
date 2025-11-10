const TRAKT_BASE_URL = "https://api.trakt.tv";

interface TraktResponse<T> {
  status: number;
  body: T | string;
  headers: Headers;
}

const readJson = async <T>(response: Response): Promise<T | string> => {
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
    },
    body: JSON.stringify({ client_id: clientId }),
  });

  return {
    status: response.status,
    body: await readJson<T>(response),
    headers: response.headers,
  };
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
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: deviceCode,
    }),
  });

  return {
    status: response.status,
    body: await readJson<T>(response),
    headers: response.headers,
  };
};
