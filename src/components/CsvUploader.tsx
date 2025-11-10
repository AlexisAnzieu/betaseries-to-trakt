import { useState } from 'react'
import { parseMovieCsv, parseShowCsv } from '../lib/csv'
import type { MovieCsvRow, ShowCsvRow } from '../lib/types'

interface CsvUploaderProps {
  showRows: ShowCsvRow[]
  movieRows: MovieCsvRow[]
  onShowRows: (rows: ShowCsvRow[]) => void
  onMovieRows: (rows: MovieCsvRow[]) => void
}

const fileInputId = (name: string) => `csv-${name}`

export const CsvUploader = ({
  showRows,
  movieRows,
  onShowRows,
  onMovieRows,
}: CsvUploaderProps) => {
  const [isParsingShows, setIsParsingShows] = useState(false)
  const [isParsingMovies, setIsParsingMovies] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseFile = async (
    file: File | null,
    parser: (file: File) => Promise<ShowCsvRow[] | MovieCsvRow[]>,
    onParsed: (rows: ShowCsvRow[] | MovieCsvRow[]) => void,
    onToggle: (value: boolean) => void,
  ) => {
    if (!file) {
      return
    }

    setError(null)
    onToggle(true)

    try {
      const parsedRows = await parser(file)
      onParsed(parsedRows)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to parse the provided CSV file.',
      )
    } finally {
      onToggle(false)
    }
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Step 2 · Import your BetaSeries exports</h2>
        <p>
          Download the <code>series-*.csv</code> and <code>films-*.csv</code>
          files from your BetaSeries advanced account settings, then drop them
          here. We&apos;ll reuse the original script logic, giving you the chance to
          inspect the parsed data before sending anything to Trakt.
        </p>
      </header>

      <div className="uploader">
        <label className="uploader__zone" htmlFor={fileInputId('shows')}>
          <input
            id={fileInputId('shows')}
            type="file"
            accept=".csv"
            className="uploader__input"
            onChange={(event) =>
              parseFile(
                event.currentTarget.files?.item(0) ?? null,
                parseShowCsv,
                (rows) => onShowRows(rows as ShowCsvRow[]),
                setIsParsingShows,
              )
            }
          />
          <span className="uploader__title">
            {isParsingShows
              ? 'Parsing shows...'
              : showRows.length
                ? `Loaded ${showRows.length} shows`
                : 'Drop your shows CSV'}
          </span>
          <span className="uploader__hint">Expecting columns id,title,episode...</span>
        </label>

        <label className="uploader__zone" htmlFor={fileInputId('movies')}>
          <input
            id={fileInputId('movies')}
            type="file"
            accept=".csv"
            className="uploader__input"
            onChange={(event) =>
              parseFile(
                event.currentTarget.files?.item(0) ?? null,
                parseMovieCsv,
                (rows) => onMovieRows(rows as MovieCsvRow[]),
                setIsParsingMovies,
              )
            }
          />
          <span className="uploader__title">
            {isParsingMovies
              ? 'Parsing movies...'
              : movieRows.length
                ? `Loaded ${movieRows.length} movies`
                : 'Drop your movies CSV'}
          </span>
          <span className="uploader__hint">Expecting columns id,title,status,date</span>
        </label>
      </div>

      {error ? <p className="panel__error">{error}</p> : null}

      <div className="panel__summary">
        <div>
          <strong>Shows</strong>
          <p>
            {showRows.length
              ? `${showRows.filter((row) => Number(row.status ?? '0') === 0).length} watchlist · ${showRows.filter((row) => Number(row.status ?? '0') !== 0).length} history`
              : 'No show CSV loaded yet'}
          </p>
        </div>
        <div>
          <strong>Movies</strong>
          <p>
            {movieRows.length
              ? `${movieRows.filter((row) => row.status === '0').length} watchlist · ${movieRows.filter((row) => row.status === '1').length} history`
              : 'No movie CSV loaded yet'}
          </p>
        </div>
      </div>
    </section>
  )
}
