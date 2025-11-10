import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "./_trakt.js";

interface TraktSyncRequestBody {
  clientId?: string;
  accessToken?: string;
  target?: string;
  payload?: unknown;
}

const ALLOWED_TARGETS = new Set(["/sync/history", "/sync/watchlist"]);

const buildSyncHeaders = (
  clientId: string,
  accessToken: string
): HeadersInit => ({
  "Content-Type": "application/json",
  "trakt-api-version": "2",
  "trakt-api-key": clientId,
  Authorization: `Bearer ${accessToken}`,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors((name, value) => res.setHeader(name, value));

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { clientId, accessToken, target, payload } = (req.body ??
    {}) as TraktSyncRequestBody;

  if (!clientId || !accessToken || !target) {
    res.status(400).json({ error: "Missing clientId, accessToken, or target" });
    return;
  }

  if (!ALLOWED_TARGETS.has(target)) {
    res.status(400).json({ error: "Unsupported Trakt endpoint" });
    return;
  }

  try {
    const response = await fetch(`https://api.trakt.tv${target}`, {
      method: "POST",
      headers: buildSyncHeaders(clientId, accessToken),
      body: JSON.stringify(payload ?? {}),
    });

    if (response.status === 204) {
      res.status(204).end();
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    res
      .status(response.status)
      .json(typeof body === "string" ? { message: body } : body);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected Trakt error",
    });
  }
}
