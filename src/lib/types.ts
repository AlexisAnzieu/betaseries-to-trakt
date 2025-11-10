export interface ShowCsvRow {
  id: string;
  title: string;
  archive?: string;
  episode?: string;
  remaining?: string;
  status?: string;
  tags?: string;
}

export interface MovieCsvRow {
  id: string;
  title: string;
  status?: string;
  date?: string;
}

export interface BetaSeriesCredentials {
  apiKey: string;
  token?: string;
}

export interface BetaSeriesShowIdentifiers {
  id: number;
  title: string;
  tvdbId?: number;
  imdbId?: string;
  slug?: string;
}

export interface BetaSeriesMovieIdentifiers {
  id: number;
  title: string;
  tmdbId?: number;
  imdbId?: string;
}

export interface TraktDeviceCode {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface TraktTokens {
  access_token: string;
  refresh_token: string;
  scope?: string;
  created_at: number;
  expires_in: number;
  token_type: string;
}

export interface TraktSyncPayload {
  shows: Array<Record<string, unknown>>;
  movies: Array<Record<string, unknown>>;
}

export interface TraktSyncResponse {
  added?: {
    shows?: number;
    episodes?: number;
    movies?: number;
  };
  updated?: {
    shows?: number;
    episodes?: number;
    movies?: number;
  };
  existing?: {
    shows?: number;
    episodes?: number;
    movies?: number;
  };
  not_found?: {
    shows?: Array<Record<string, unknown>>;
    episodes?: Array<Record<string, unknown>>;
    movies?: Array<Record<string, unknown>>;
  };
}

export interface MigrationProgress {
  total: number;
  completed: number;
  currentLabel?: string;
}

export interface MigrationResult {
  history?: TraktSyncResponse;
  watchlist?: TraktSyncResponse;
  failures: string[];
}

export type DeviceTokenErrorCode =
  | "authorization_pending"
  | "slow_down"
  | "expired_token"
  | "invalid_grant"
  | "invalid_client"
  | "unsupported_grant_type"
  | "server_error";

export class DeviceTokenError extends Error {
  readonly code: DeviceTokenErrorCode;

  constructor(code: DeviceTokenErrorCode, message: string) {
    super(message);
    this.name = "DeviceTokenError";
    this.code = code;
  }
}
