import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors, requestTraktDeviceCode } from './_trakt'

interface DeviceCodeRequestBody {
  clientId?: string
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  applyCors((name, value) => res.setHeader(name, value))

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { clientId } = (req.body ?? {}) as DeviceCodeRequestBody

  if (!clientId) {
    res.status(400).json({ error: 'Missing clientId' })
    return
  }

  try {
    const traktResponse = await requestTraktDeviceCode(clientId)
    res
      .status(traktResponse.status)
      .json(typeof traktResponse.body === 'string' ? { message: traktResponse.body } : traktResponse.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected Trakt error',
    })
  }
}
