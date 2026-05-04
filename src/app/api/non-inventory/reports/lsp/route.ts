import type { NextRequest } from 'next/server'
import { proxyReportGet } from '../_helpers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyReportGet(
    request,
    '/reports/lsp',
    'Unable to fetch LSP report.',
  )
}
