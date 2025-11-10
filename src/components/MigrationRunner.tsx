import { useMemo, useState } from 'react'
import { migrateLibrary } from '../lib/migration'
import type {
  BetaSeriesCredentials,
  MigrationProgress,
  MigrationResult,
  MovieCsvRow,
  ShowCsvRow,
  TraktTokens,
} from '../lib/types'

interface MigrationRunnerProps {
  credentials: BetaSeriesCredentials
  shows: ShowCsvRow[]
  movies: MovieCsvRow[]
  traktClientId: string
  tokens: TraktTokens | null
}

const formatSyncResponse = (label: string, value?: number) =>
  `${value ?? 0} ${label}${value === 1 ? '' : 's'}`

export const MigrationRunner = ({
  credentials,
  shows,
  movies,
  traktClientId,
  tokens,
}: MigrationRunnerProps) => {
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const isReady = useMemo(() => {
    if (!credentials.apiKey.trim()) {
      return false
    }

    if (!tokens) {
      return false
    }

    if (!traktClientId.trim()) {
      return false
    }

    return shows.length + movies.length > 0
  }, [credentials.apiKey, movies.length, shows.length, tokens, traktClientId])

  const summary = useMemo(() => {
    const showWatchlist = shows.filter((row) => Number(row.status ?? '0') === 0)
    const showHistory = shows.filter((row) => Number(row.status ?? '0') !== 0)
    const movieWatchlist = movies.filter((row) => row.status === '0')
    const movieHistory = movies.filter((row) => row.status === '1')

    return {
      showWatchlist: showWatchlist.length,
      showHistory: showHistory.length,
      movieWatchlist: movieWatchlist.length,
      movieHistory: movieHistory.length,
      total: showWatchlist.length +
        showHistory.length +
        movieWatchlist.length +
        movieHistory.length,
    }
  }, [movies, shows])

  const handleMigration = async () => {
    if (!tokens) {
      return
    }

    setIsRunning(true)
    setError(null)
    setProgress({ total: summary.total, completed: 0 })
    setResult(null)

    try {
      const migrationResult = await migrateLibrary({
        credentials,
        shows,
        movies,
        traktClientId,
        tokens,
        onProgress: setProgress,
      })

      setResult(migrationResult)
      setProgress(null)

      if (migrationResult.failures.length) {
        setError(
          `${migrationResult.failures.length} item(s) could not be migrated. Review the list below.`,
        )
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Migration failed unexpectedly.',
      )
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Step 4 · Review and migrate</h2>
        <p>
          Double check the counts below, then start the migration. We will send
          two payloads to Trakt: one for history and one for your watchlists, and
          display their responses in real time.
        </p>
      </header>

      <div className="panel__summary">
        <div>
          <strong>Shows</strong>
          <p>{summary.showHistory} history · {summary.showWatchlist} watchlist</p>
        </div>
        <div>
          <strong>Movies</strong>
          <p>{summary.movieHistory} history · {summary.movieWatchlist} watchlist</p>
        </div>
      </div>

      <button
        type="button"
        className="button button--primary"
        onClick={handleMigration}
        disabled={!isReady || isRunning}
      >
        {isRunning ? 'Migrating…' : 'Start migration'}
      </button>

      {progress ? (
        <div className="progress">
          <div className="progress__bar">
            <div
              className="progress__bar-fill"
              style={{ width: `${Math.min(100, (progress.completed / Math.max(progress.total, 1)) * 100)}%` }}
            />
          </div>
          <p className="progress__label">
            {progress.completed} / {progress.total} · {progress.currentLabel ?? 'Fetching identifiers'}
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="panel__results">
          {result.history ? (
            <div>
              <h3>History</h3>
              <p>
                {formatSyncResponse('show', result.history.added?.shows)} ·{' '}
                {formatSyncResponse('episode', result.history.added?.episodes)} ·{' '}
                {formatSyncResponse('movie', result.history.added?.movies)}
              </p>
            </div>
          ) : null}

          {result.watchlist ? (
            <div>
              <h3>Watchlist</h3>
              <p>
                {formatSyncResponse('show', result.watchlist.added?.shows)} ·{' '}
                {formatSyncResponse('movie', result.watchlist.added?.movies)}
              </p>
            </div>
          ) : null}

          {result.failures.length ? (
            <details>
              <summary>{result.failures.length} unresolved item(s)</summary>
              <ul>
                {result.failures.map((failure) => (
                  <li key={failure}>{failure}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="panel__error">{error}</p> : null}
    </section>
  )
}
