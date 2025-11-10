import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, exchangeTraktDeviceCode } from "./_trakt";

interface DeviceTokenRequestBody {
  clientId?: string;
  clientSecret?: string;
  deviceCode?: string;
}

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

  const { clientId, clientSecret, deviceCode } = (req.body ??
    {}) as DeviceTokenRequestBody;

  if (!clientId || !clientSecret || !deviceCode) {
    res
      .status(400)
      .json({ error: "Missing clientId, clientSecret, or deviceCode" });
    return;
  }

  try {
    const traktResponse = await exchangeTraktDeviceCode(
      clientId,
      clientSecret,
      deviceCode
    );
    res
      .status(traktResponse.status)
      .json(
        typeof traktResponse.body === "string"
          ? { message: traktResponse.body }
          : traktResponse.body
      );
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected Trakt error",
    });
  }
}
