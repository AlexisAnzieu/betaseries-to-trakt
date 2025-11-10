import type {
  BetaSeriesCredentials,
  BetaSeriesMovieIdentifiers,
  BetaSeriesShowIdentifiers,
} from "./types";

const BASE_URL = "https://api.betaseries.com";

const defaultHeaders = (credentials: BetaSeriesCredentials) => {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-BetaSeries-Key": credentials.apiKey,
  };

  if (credentials.token) {
    headers["X-BetaSeries-Token"] = credentials.token;
  }

  return headers;
};

const request = async <T>(
  endpoint: string,
  credentials: BetaSeriesCredentials,
  init: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      ...defaultHeaders(credentials),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `BetaSeries request failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  return (await response.json()) as T;
};

interface BetaSeriesShowResponse {
  show: {
    id: number;
    title: string;
    thetvdb_id?: number;
    imdb_id?: string;
    slug?: string;
  };
}

interface BetaSeriesMovieResponse {
  movie: {
    id: number;
    title: string;
    tmdb_id?: number;
    imdb_id?: string;
  };
}

export const fetchShowIdentifiers = async (
  showId: string,
  credentials: BetaSeriesCredentials
): Promise<BetaSeriesShowIdentifiers> => {
  const data = await request<BetaSeriesShowResponse>(
    `/shows/display?id=${encodeURIComponent(showId)}`,
    credentials
  );

  return {
    id: data.show.id,
    title: data.show.title,
    tvdbId: data.show.thetvdb_id,
    imdbId: data.show.imdb_id,
    slug: data.show.slug,
  };
};

export const fetchMovieIdentifiers = async (
  movieId: string,
  credentials: BetaSeriesCredentials
): Promise<BetaSeriesMovieIdentifiers> => {
  const data = await request<BetaSeriesMovieResponse>(
    `/movies/movie?id=${encodeURIComponent(movieId)}`,
    credentials
  );

  return {
    id: data.movie.id,
    title: data.movie.title,
    tmdbId: data.movie.tmdb_id,
    imdbId: data.movie.imdb_id,
  };
};
