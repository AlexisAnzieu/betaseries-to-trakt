import { useEffect, useState } from "react";
import { BetaSeriesForm } from "./components/BetaSeriesForm";
import { CsvUploader } from "./components/CsvUploader";
import { MigrationRunner } from "./components/MigrationRunner";
import { TraktDeviceFlow } from "./components/TraktDeviceFlow";
import type {
  BetaSeriesCredentials,
  MovieCsvRow,
  ShowCsvRow,
  TraktTokens,
} from "./lib/types";
import "./App.css";

const storageKey = {
  betaseries: "betaseries-credentials",
  traktClientId: "trakt-client-id",
} as const;

const safeParseJson = <T,>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("Unable to parse JSON from storage", error);
    return null;
  }
};

const initialBetaSeriesCredentials = (): BetaSeriesCredentials =>
  safeParseJson<BetaSeriesCredentials>(
    typeof window !== "undefined"
      ? window.localStorage.getItem(storageKey.betaseries)
      : null
  ) ?? { apiKey: "", token: "" };

const initialTraktClientId = () =>
  (typeof window !== "undefined"
    ? window.localStorage.getItem(storageKey.traktClientId)
    : "") ?? "";

function App() {
  const [credentials, setCredentials] = useState<BetaSeriesCredentials>(
    initialBetaSeriesCredentials
  );
  const [shows, setShows] = useState<ShowCsvRow[]>([]);
  const [movies, setMovies] = useState<MovieCsvRow[]>([]);
  const [traktClientId, setTraktClientId] = useState(initialTraktClientId);
  const [traktClientSecret, setTraktClientSecret] = useState("");
  const [tokens, setTokens] = useState<TraktTokens | null>(null);

  useEffect(() => {
    const apiKey = credentials.apiKey.trim();
    if (apiKey) {
      window.localStorage.setItem(
        storageKey.betaseries,
        JSON.stringify({ ...credentials, apiKey })
      );
    } else {
      window.localStorage.removeItem(storageKey.betaseries);
    }
  }, [credentials]);

  useEffect(() => {
    const value = traktClientId.trim();
    if (value) {
      window.localStorage.setItem(storageKey.traktClientId, value);
    } else {
      window.localStorage.removeItem(storageKey.traktClientId);
    }
  }, [traktClientId]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>BetaSeries → Trakt migrator</h1>
        <p>
          A React + Vite port of the original Python script. Authenticate, load
          your BetaSeries exports, and push the data straight into Trakt without
          leaving your browser.
        </p>
      </header>

      <main className="app__content">
        <BetaSeriesForm credentials={credentials} onChange={setCredentials} />

        <CsvUploader
          showRows={shows}
          movieRows={movies}
          onShowRows={setShows}
          onMovieRows={setMovies}
        />

        <TraktDeviceFlow
          clientId={traktClientId}
          clientSecret={traktClientSecret}
          tokens={tokens}
          onClientIdChange={setTraktClientId}
          onClientSecretChange={setTraktClientSecret}
          onTokens={setTokens}
          onResetTokens={() => setTokens(null)}
        />

        <MigrationRunner
          credentials={credentials}
          shows={shows}
          movies={movies}
          traktClientId={traktClientId}
          tokens={tokens}
        />
      </main>

      <footer className="app__footer">
        <small>
          Need a refresher? Review the original CLI workflow on{" "}
          <a
            href="https://github.com/tuxity/betaseries-to-trakt"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>{" "}
          or the official{" "}
          <a
            href="https://developers.betaseries.com/"
            target="_blank"
            rel="noreferrer"
          >
            BetaSeries
          </a>{" "}
          and{" "}
          <a
            href="https://trakt.docs.apiary.io/"
            target="_blank"
            rel="noreferrer"
          >
            Trakt
          </a>{" "}
          documentation.
        </small>
      </footer>
    </div>
  );
}

export default App;
