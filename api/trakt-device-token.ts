import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, exchangeTraktDeviceCode } from "./_trakt.js";

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

  console.log("[trakt-device-token] Incoming request", {
    method: req.method,
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasDeviceCode: Boolean(deviceCode),
    deviceCodeLength: deviceCode?.length ?? 0,
  });

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

    console.log("[trakt-device-token] Trakt response", {
      status: traktResponse.status,
      hasBody: Boolean(traktResponse.body),
      bodyType: typeof traktResponse.body,
      bodyPreview:
        typeof traktResponse.body === "string"
          ? traktResponse.body.slice(0, 120)
          : JSON.stringify(traktResponse.body).slice(0, 120),
    });

    res
      .status(traktResponse.status)
      .json(
        typeof traktResponse.body === "string"
          ? { message: traktResponse.body }
          : traktResponse.body
      );
  } catch (error) {
    console.error("[trakt-device-token] Failed to exchange code", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected Trakt error",
    });
  }
}
