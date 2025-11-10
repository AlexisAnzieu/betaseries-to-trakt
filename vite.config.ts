import { defineConfig } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import react from "@vitejs/plugin-react";
import {
  applyCors,
  exchangeTraktDeviceCode,
  requestTraktDeviceCode,
} from "./api/_trakt.js";

interface DeviceCodeRequestBody {
  clientId?: string;
}

interface DeviceTokenRequestBody {
  clientId?: string;
  clientSecret?: string;
  deviceCode?: string;
}

interface SyncRequestBody {
  clientId?: string;
  accessToken?: string;
  target?: string;
  payload?: unknown;
}

const readBody = async (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let data = "";

    req
      .on("data", (chunk) => {
        data += chunk;
      })
      .on("end", () => {
        try {
          resolve(data.length ? JSON.parse(data) : {});
        } catch (error) {
          reject(error);
        }
      })
      .on("error", reject);
  });

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const setCors = (res: ServerResponse) => {
  applyCors((name, value) => {
    res.setHeader(name, value);
  });
};

const handleOptions = (res: ServerResponse) => {
  setCors(res);
  res.statusCode = 204;
  res.end();
};

const ensureMethod = (
  req: IncomingMessage,
  res: ServerResponse,
  method: string
) => {
  if (req.method !== method) {
    setCors(res);
    sendJson(res, 405, { error: "Method not allowed" });
    return false;
  }
  return true;
};

const allowedSyncTargets = new Set(["/sync/history", "/sync/watchlist"]);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-trakt-proxy",
      configureServer(server) {
        server.middlewares.use("/api/trakt-device-code", async (req, res) => {
          if (req.method === "OPTIONS") {
            handleOptions(res);
            return;
          }

          if (!ensureMethod(req, res, "POST")) {
            return;
          }

          try {
            const body = (await readBody(req)) as DeviceCodeRequestBody;
            const clientId = body.clientId;

            if (!clientId) {
              setCors(res);
              sendJson(res, 400, { error: "Missing clientId" });
              return;
            }

            const traktResponse = await requestTraktDeviceCode(clientId);
            setCors(res);
            sendJson(
              res,
              traktResponse.status,
              typeof traktResponse.body === "string"
                ? { message: traktResponse.body }
                : traktResponse.body
            );
          } catch (error) {
            setCors(res);
            sendJson(res, 500, {
              error:
                error instanceof Error
                  ? error.message
                  : "Unexpected Trakt error",
            });
          }
        });

        server.middlewares.use("/api/trakt-device-token", async (req, res) => {
          if (req.method === "OPTIONS") {
            handleOptions(res);
            return;
          }

          if (!ensureMethod(req, res, "POST")) {
            return;
          }

          try {
            const body = (await readBody(req)) as DeviceTokenRequestBody;
            const { clientId, clientSecret, deviceCode } = body;

            if (!clientId || !clientSecret || !deviceCode) {
              setCors(res);
              sendJson(res, 400, {
                error: "Missing clientId, clientSecret, or deviceCode",
              });
              return;
            }

            const traktResponse = await exchangeTraktDeviceCode(
              clientId,
              clientSecret,
              deviceCode
            );

            setCors(res);
            sendJson(
              res,
              traktResponse.status,
              typeof traktResponse.body === "string"
                ? { message: traktResponse.body }
                : traktResponse.body
            );
          } catch (error) {
            setCors(res);
            sendJson(res, 500, {
              error:
                error instanceof Error
                  ? error.message
                  : "Unexpected Trakt error",
            });
          }
        });

        server.middlewares.use("/api/trakt-sync", async (req, res) => {
          if (req.method === "OPTIONS") {
            handleOptions(res);
            return;
          }

          if (!ensureMethod(req, res, "POST")) {
            return;
          }

          try {
            const body = (await readBody(req)) as SyncRequestBody;
            const { clientId, accessToken, target, payload } = body;

            if (!clientId || !accessToken || !target) {
              setCors(res);
              sendJson(res, 400, {
                error: "Missing clientId, accessToken, or target",
              });
              return;
            }

            if (!allowedSyncTargets.has(target)) {
              setCors(res);
              sendJson(res, 400, { error: "Unsupported Trakt endpoint" });
              return;
            }

            const response = await fetch(`https://api.trakt.tv${target}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "trakt-api-version": "2",
                "trakt-api-key": clientId,
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(payload ?? {}),
            });

            setCors(res);

            if (response.status === 204) {
              res.statusCode = 204;
              res.end();
              return;
            }

            const contentType = response.headers.get("content-type") ?? "";
            const responseBody = contentType.includes("application/json")
              ? await response.json()
              : await response.text();

            sendJson(
              res,
              response.status,
              typeof responseBody === "string"
                ? { message: responseBody }
                : responseBody
            );
          } catch (error) {
            setCors(res);
            sendJson(res, 500, {
              error:
                error instanceof Error
                  ? error.message
                  : "Unexpected Trakt error",
            });
          }
        });
      },
    },
  ],
});
