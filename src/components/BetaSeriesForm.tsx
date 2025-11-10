import type { BetaSeriesCredentials } from '../lib/types'

interface BetaSeriesFormProps {
  credentials: BetaSeriesCredentials
  onChange: (credentials: BetaSeriesCredentials) => void
}

const fieldId = (name: string) => `betaseries-${name}`

export const BetaSeriesForm = ({ credentials, onChange }: BetaSeriesFormProps) => (
  <section className="panel">
    <header className="panel__header">
      <h2>Step 1 · BetaSeries API access</h2>
      <p>
        Provide your personal BetaSeries API key. The key is required to resolve
        TV show and movie identifiers used by Trakt. The optional member token
        is only necessary if you plan to rely on authenticated endpoints in the
        future.
      </p>
    </header>

    <div className="field">
      <label className="field__label" htmlFor={fieldId('api-key')}>
        API key
      </label>
      <input
        id={fieldId('api-key')}
        autoComplete="off"
        inputMode="text"
        className="field__input"
        placeholder="bs_xxxxx"
        value={credentials.apiKey}
        onChange={(event) =>
          onChange({ ...credentials, apiKey: event.currentTarget.value.trim() })
        }
      />
    </div>

    <div className="field">
      <label className="field__label" htmlFor={fieldId('token')}>
        Member token (optional)
      </label>
      <input
        id={fieldId('token')}
        autoComplete="off"
        inputMode="text"
        className="field__input"
        placeholder="Leave empty if you only use public endpoints"
        value={credentials.token ?? ''}
        onChange={(event) =>
          onChange({ ...credentials, token: event.currentTarget.value.trim() })
        }
      />
    </div>
  </section>
)
