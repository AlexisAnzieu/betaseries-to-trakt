import { fetchMovieIdentifiers, fetchShowIdentifiers } from "./betaseries";
import { syncHistory, syncWatchlist } from "./trakt";
import type {
  BetaSeriesCredentials,
  BetaSeriesMovieIdentifiers,
  BetaSeriesShowIdentifiers,
  MigrationProgress,
  MigrationResult,
  MovieCsvRow,
  ShowCsvRow,
  TraktSyncPayload,
  TraktSyncResponse,
  TraktTokens,
} from "./types";

const WATCHED_AT_RELEASED = "released";

const parseEpisodeCode = (code?: string | null) => {
  if (!code) {
    return null;
  }

  const match = /S(\d+)E(\d+)/i.exec(code);
  if (!match) {
    return null;
  }

  return {
    season: Number.parseInt(match[1] ?? "0", 10),
    episode: Number.parseInt(match[2] ?? "0", 10),
  };
};

const buildShowIdentifiers = (identifiers: BetaSeriesShowIdentifiers) => {
  const ids: Record<string, unknown> = {};

  if (identifiers.tvdbId) {
    ids.tvdb = identifiers.tvdbId;
  }

  if (identifiers.imdbId) {
    ids.imdb = identifiers.imdbId;
  }

  if (identifiers.slug) {
    ids.slug = identifiers.slug;
  }

  return ids;
};

const buildMovieIdentifiers = (identifiers: BetaSeriesMovieIdentifiers) => {
  const ids: Record<string, unknown> = {};

  if (identifiers.tmdbId) {
    ids.tmdb = identifiers.tmdbId;
  }

  if (identifiers.imdbId) {
    ids.imdb = identifiers.imdbId;
  }

  return ids;
};

const createShowHistoryEntry = (
  row: ShowCsvRow,
  identifiers: BetaSeriesShowIdentifiers
) => {
  const ids = buildShowIdentifiers(identifiers);
  if (Object.keys(ids).length === 0) {
    return null;
  }

  const statusNumeric = Number.parseFloat(row.status ?? "0");
  const lastEpisode = parseEpisodeCode(row.episode);
  const title = identifiers.title || row.title;

  if (Number.isNaN(statusNumeric)) {
    return {
      title,
      ids,
      watched_at: WATCHED_AT_RELEASED,
    };
  }

  if (statusNumeric >= 100 || !lastEpisode) {
    return {
      title,
      ids,
      watched_at: WATCHED_AT_RELEASED,
    };
  }

  const seasons: Array<Record<string, unknown>> = [];

  for (let season = 1; season <= lastEpisode.season; season += 1) {
    const seasonEntry: Record<string, unknown> = {
      number: season,
      watched_at: WATCHED_AT_RELEASED,
    };

    if (season === lastEpisode.season) {
      const episodes: Array<Record<string, unknown>> = [];
      for (let episode = 1; episode <= lastEpisode.episode; episode += 1) {
        episodes.push({ number: episode, watched_at: WATCHED_AT_RELEASED });
      }
      seasonEntry.episodes = episodes;
    }

    seasons.push(seasonEntry);
  }

  return {
    title,
    ids,
    watched_at: WATCHED_AT_RELEASED,
    seasons,
  };
};

const createShowWatchlistEntry = (
  row: ShowCsvRow,
  identifiers: BetaSeriesShowIdentifiers
) => {
  const ids = buildShowIdentifiers(identifiers);
  if (Object.keys(ids).length === 0) {
    return null;
  }

  return {
    title: identifiers.title || row.title,
    ids,
  };
};

const createMovieHistoryEntry = (
  row: MovieCsvRow,
  identifiers: BetaSeriesMovieIdentifiers
) => {
  const ids = buildMovieIdentifiers(identifiers);
  if (Object.keys(ids).length === 0) {
    return null;
  }

  const watchedAt = (() => {
    if (!row.date) {
      return WATCHED_AT_RELEASED;
    }

    const parsed = new Date(row.date);
    if (Number.isNaN(parsed.getTime())) {
      return WATCHED_AT_RELEASED;
    }

    return parsed.toISOString();
  })();

  return {
    title: identifiers.title || row.title,
    ids,
    watched_at: watchedAt,
  };
};

const createMovieWatchlistEntry = (
  row: MovieCsvRow,
  identifiers: BetaSeriesMovieIdentifiers
) => {
  const ids = buildMovieIdentifiers(identifiers);
  if (Object.keys(ids).length === 0) {
    return null;
  }

  return {
    title: identifiers.title || row.title,
    ids,
  };
};

interface MigrationOptions {
  credentials: BetaSeriesCredentials;
  shows: ShowCsvRow[];
  movies: MovieCsvRow[];
  traktClientId: string;
  tokens: TraktTokens;
  onProgress?: (progress: MigrationProgress) => void;
}

export const migrateLibrary = async ({
  credentials,
  shows,
  movies,
  traktClientId,
  tokens,
  onProgress,
}: MigrationOptions): Promise<MigrationResult> => {
  const showWatchlistRows = shows.filter(
    (row) => Number(row.status ?? "0") === 0
  );
  const showHistoryRows = shows.filter(
    (row) => Number(row.status ?? "0") !== 0
  );
  const movieWatchlistRows = movies.filter((row) => row.status === "0");
  const movieHistoryRows = movies.filter((row) => row.status === "1");

  const totalItems =
    showWatchlistRows.length +
    showHistoryRows.length +
    movieWatchlistRows.length +
    movieHistoryRows.length;

  let processedItems = 0;
  const failures: string[] = [];

  const updateProgress = (label?: string) => {
    processedItems += 1;
    onProgress?.({
      total: totalItems,
      completed: processedItems,
      currentLabel: label,
    });
  };

  const watchlistPayload: TraktSyncPayload = { shows: [], movies: [] };
  const historyPayload: TraktSyncPayload = { shows: [], movies: [] };

  for (const row of showWatchlistRows) {
    try {
      const identifiers = await fetchShowIdentifiers(row.id, credentials);
      const entry = createShowWatchlistEntry(row, identifiers);
      if (entry) {
        watchlistPayload.shows.push(entry);
      } else {
        failures.push(`Missing identifiers for show ${row.title} (${row.id})`);
      }
    } catch (error) {
      failures.push(
        error instanceof Error
          ? `Show ${row.title}: ${error.message}`
          : `Show ${row.title}: unknown error`
      );
    } finally {
      updateProgress(row.title);
    }
  }

  for (const row of showHistoryRows) {
    try {
      const identifiers = await fetchShowIdentifiers(row.id, credentials);
      const entry = createShowHistoryEntry(row, identifiers);
      if (entry) {
        historyPayload.shows.push(entry);
      } else {
        failures.push(`Missing identifiers for show ${row.title} (${row.id})`);
      }
    } catch (error) {
      failures.push(
        error instanceof Error
          ? `Show ${row.title}: ${error.message}`
          : `Show ${row.title}: unknown error`
      );
    } finally {
      updateProgress(row.title);
    }
  }

  for (const row of movieWatchlistRows) {
    try {
      const identifiers = await fetchMovieIdentifiers(row.id, credentials);
      const entry = createMovieWatchlistEntry(row, identifiers);
      if (entry) {
        watchlistPayload.movies.push(entry);
      } else {
        failures.push(`Missing identifiers for movie ${row.title} (${row.id})`);
      }
    } catch (error) {
      failures.push(
        error instanceof Error
          ? `Movie ${row.title}: ${error.message}`
          : `Movie ${row.title}: unknown error`
      );
    } finally {
      updateProgress(row.title);
    }
  }

  for (const row of movieHistoryRows) {
    try {
      const identifiers = await fetchMovieIdentifiers(row.id, credentials);
      const entry = createMovieHistoryEntry(row, identifiers);
      if (entry) {
        historyPayload.movies.push(entry);
      } else {
        failures.push(`Missing identifiers for movie ${row.title} (${row.id})`);
      }
    } catch (error) {
      failures.push(
        error instanceof Error
          ? `Movie ${row.title}: ${error.message}`
          : `Movie ${row.title}: unknown error`
      );
    } finally {
      updateProgress(row.title);
    }
  }

  let historyResponse: TraktSyncResponse | undefined;
  let watchlistResponse: TraktSyncResponse | undefined;

  if (historyPayload.shows.length || historyPayload.movies.length) {
    historyResponse = await syncHistory(
      historyPayload,
      traktClientId,
      tokens.access_token
    );
  }

  if (watchlistPayload.shows.length || watchlistPayload.movies.length) {
    watchlistResponse = await syncWatchlist(
      watchlistPayload,
      traktClientId,
      tokens.access_token
    );
  }

  return {
    history: historyResponse,
    watchlist: watchlistResponse,
    failures,
  };
};
