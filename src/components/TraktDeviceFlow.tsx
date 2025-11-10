import { useEffect, useMemo, useState } from "react";
import { exchangeDeviceCode, requestDeviceCode } from "../lib/trakt";
import { DeviceTokenError } from "../lib/types";
import type { TraktDeviceCode, TraktTokens } from "../lib/types";

interface TraktDeviceFlowProps {
  clientId: string;
  clientSecret: string;
  tokens: TraktTokens | null;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onTokens: (tokens: TraktTokens) => void;
  onResetTokens?: () => void;
}

type FlowStatus = "idle" | "requesting" | "waiting" | "approved" | "error";

const fieldId = (name: string) => `trakt-${name}`;

const formatDuration = (ms: number) => {
  if (ms <= 0) {
    return "expired";
  }

  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

export const TraktDeviceFlow = ({
  clientId,
  clientSecret,
  tokens,
  onClientIdChange,
  onClientSecretChange,
  onTokens,
  onResetTokens,
}: TraktDeviceFlowProps) => {
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [deviceCode, setDeviceCode] = useState<TraktDeviceCode | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === "waiting" && expiresAt) {
      const timer = window.setInterval(() => setNow(Date.now()), 1_000);
      return () => window.clearInterval(timer);
    }

    return undefined;
  }, [status, expiresAt]);

  useEffect(() => {
    if (!deviceCode || status !== "waiting") {
      return undefined;
    }

    if (!clientSecret) {
      setMessage(
        "Provide your Trakt client secret to start polling for approval."
      );
      return undefined;
    }

    let isCancelled = false;
    const pendingTimeouts = new Set<number>();

    const wait = (duration: number) =>
      new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          pendingTimeouts.delete(timeoutId);
          resolve();
        }, duration);
        pendingTimeouts.add(timeoutId);
      });

    const poll = async () => {
      let delay = deviceCode.interval * 1_000;

      while (!isCancelled) {
        if (expiresAt && Date.now() > expiresAt) {
          setStatus("error");
          setMessage("Device code expired. Request a new code and try again.");
          return;
        }

        try {
          const response = await exchangeDeviceCode(
            clientId,
            clientSecret,
            deviceCode.device_code
          );

          if (isCancelled) {
            return;
          }

          setStatus("approved");
          setMessage("Trakt granted access. You can now migrate your library.");
          onTokens(response);
          return;
        } catch (error) {
          if (!(error instanceof DeviceTokenError)) {
            setStatus("error");
            setMessage(
              error instanceof Error ? error.message : "Unexpected Trakt error."
            );
            return;
          }

          switch (error.code) {
            case "authorization_pending":
              // keep polling
              break;
            case "slow_down":
              delay += 5_000;
              break;
            case "expired_token":
              setStatus("error");
              setMessage(
                "Device code expired. Request a new code and try again."
              );
              return;
            default:
              setStatus("error");
              setMessage(error.message);
              return;
          }
        }

        await wait(delay);
      }
    };

    void poll();

    return () => {
      isCancelled = true;
      pendingTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      pendingTimeouts.clear();
    };
  }, [clientId, clientSecret, deviceCode, expiresAt, onTokens, status]);

  const remainingTime = useMemo(() => {
    if (!expiresAt) {
      return null;
    }
    return formatDuration(expiresAt - now);
  }, [expiresAt, now]);

  const handleRequestCode = async () => {
    if (!clientId) {
      setMessage("Enter your Trakt client id before requesting a device code.");
      return;
    }

    onResetTokens?.();
    setStatus("requesting");
    setMessage(null);

    try {
      const code = await requestDeviceCode(clientId);
      setDeviceCode(code);
      setExpiresAt(Date.now() + code.expires_in * 1_000);
      setStatus("waiting");
      setMessage(
        "Visit Trakt, enter the user code and approve the application."
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to request a device code. Please retry."
      );
    }
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Step 3 · Authorize Trakt</h2>
        <p>
          Trakt requires a short-lived device authorization. Provide the client
          id and secret from your personal application, request a code, then
          follow the link to approve access.
        </p>
      </header>

      <div className="field">
        <label className="field__label" htmlFor={fieldId("client-id")}>
          Client ID
        </label>
        <input
          id={fieldId("client-id")}
          className="field__input"
          placeholder="Copy the public client id from trakt.tv"
          value={clientId}
          onChange={(event) =>
            onClientIdChange(event.currentTarget.value.trim())
          }
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={fieldId("client-secret")}>
          Client secret
        </label>
        <input
          id={fieldId("client-secret")}
          className="field__input"
          placeholder="Paste the client secret from trakt.tv"
          value={clientSecret}
          onChange={(event) =>
            onClientSecretChange(event.currentTarget.value.trim())
          }
        />
      </div>

      <button
        type="button"
        className="button"
        onClick={handleRequestCode}
        disabled={status === "requesting"}
      >
        {status === "requesting"
          ? "Requesting device code…"
          : "Request device code"}
      </button>

      {deviceCode && status !== "approved" ? (
        <aside className="device-flow">
          <p>
            Visit{" "}
            <a
              href={deviceCode.verification_url}
              target="_blank"
              rel="noreferrer"
            >
              {deviceCode.verification_url}
            </a>{" "}
            and type the user code below. The code expires {remainingTime ?? ""}
            .
          </p>
          <code className="device-flow__code">{deviceCode.user_code}</code>
        </aside>
      ) : null}

      {tokens ? (
        <div className="panel__summary">
          <div>
            <strong>Access token</strong>
            <p>{tokens.access_token.slice(0, 8)}•••</p>
          </div>
          <div>
            <strong>Refresh token</strong>
            <p>{tokens.refresh_token.slice(0, 8)}•••</p>
          </div>
        </div>
      ) : null}

      {message ? <p className="panel__message">{message}</p> : null}
    </section>
  );
};
