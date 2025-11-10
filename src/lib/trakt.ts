import {
  DeviceTokenError,
  type DeviceTokenErrorCode,
  type TraktDeviceCode,
  type TraktSyncPayload,
  type TraktSyncResponse,
  type TraktTokens,
} from './types'

interface TraktErrorResponse {
  error?: string
  error_description?: string
}

const toJson = <T>(response: Response): Promise<T> => response.json() as Promise<T>

const buildJsonRequest = (body: Record<string, unknown>) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
}) satisfies RequestInit

const extractDeviceError = async (response: Response) => {
  let errorCode: DeviceTokenErrorCode = 'server_error'
  let message = `${response.status} ${response.statusText}`

  try {
    const payload = (await response.json()) as TraktErrorResponse
    if (payload.error) {
      errorCode = payload.error as DeviceTokenErrorCode
    }
    if (payload.error_description) {
      message = payload.error_description
    }
  } catch (error) {
    if (error instanceof Error) {
      message = error.message
    }
  }

  throw new DeviceTokenError(errorCode, message)
}

export const requestDeviceCode = async (
  clientId: string,
): Promise<TraktDeviceCode> => {
  const response = await fetch(
    '/api/trakt-device-code',
    buildJsonRequest({ clientId }),
  )

  if (!response.ok) {
    throw new Error(`Unable to request device code: ${response.status}`)
  }

  return toJson<TraktDeviceCode>(response)
}

export const exchangeDeviceCode = async (
  clientId: string,
  clientSecret: string,
  deviceCode: string,
): Promise<TraktTokens> => {
  const response = await fetch(
    '/api/trakt-device-token',
    buildJsonRequest({
      clientId,
      clientSecret,
      deviceCode,
    }),
  )

  if (response.ok) {
    return toJson<TraktTokens>(response)
  }

  if (response.status === 400) {
    await extractDeviceError(response)
  }

  throw new Error(`Unable to exchange device code: ${response.status}`)
}

const traktSyncRequest = async <T>(
  endpoint: '/sync/history' | '/sync/watchlist',
  payload: TraktSyncPayload,
  clientId: string,
  accessToken: string,
): Promise<T> => {
  const response = await fetch('/api/trakt-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      accessToken,
      target: endpoint,
      payload,
    }),
  })

  if (response.status === 204) {
    return {} as T
  }

  if (!response.ok) {
    const details = await response.text()
    throw new Error(
      `Trakt request failed: ${response.status} ${response.statusText} - ${details}`,
    )
  }

  return toJson<T>(response)
}

export const syncHistory = (
  payload: TraktSyncPayload,
  clientId: string,
  accessToken: string,
) => traktSyncRequest<TraktSyncResponse>('/sync/history', payload, clientId, accessToken)

export const syncWatchlist = (
  payload: TraktSyncPayload,
  clientId: string,
  accessToken: string,
) =>
  traktSyncRequest<TraktSyncResponse>('/sync/watchlist', payload, clientId, accessToken)
