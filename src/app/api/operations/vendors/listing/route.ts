import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/vendor/getAllVendors`)

    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('status', request.nextUrl.searchParams.get('status')?.trim() ?? 'APPROVE')
    url.searchParams.set('userId', request.nextUrl.searchParams.get('userId')?.trim() ?? '')
    url.searchParams.set('vendorDetailId', request.nextUrl.searchParams.get('vendorDetailId')?.trim() ?? '')
    url.searchParams.set('verifiedUser', request.nextUrl.searchParams.get('verifiedUser')?.trim() ?? 'false')

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch vendors.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text()

    return proxyJsonRequest(`${getBaseUrl()}/vendor/create-vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create vendor.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { ssoId?: string; activate?: boolean }
    const ssoId = payload.ssoId?.trim()

    if (!ssoId) {
      return NextResponse.json({ message: 'Missing vendor SSO ID.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/vendor`)
    url.searchParams.set('ssoId', ssoId)
    url.searchParams.set('activate', String(Boolean(payload.activate)))

    return proxyJsonRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update vendor status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ssoId = request.nextUrl.searchParams.get('ssoId')?.trim()
    if (!ssoId) {
      return NextResponse.json({ message: 'Missing vendor SSO ID.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/vendor`)
    url.searchParams.set('ssoId', ssoId)

    return proxyJsonRequest(url.toString(), { method: 'DELETE' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete vendor.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
