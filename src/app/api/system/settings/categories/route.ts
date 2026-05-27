import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'
import { proxySettingsGet, proxySettingsPost, proxySettingsPut } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/category', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch categories.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxySettingsPost('/category', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save category.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get('categoryId')?.trim()
    const path = categoryId ? `/category?categoryId=${encodeURIComponent(categoryId)}` : '/category'
    return await proxySettingsPut(path, request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update category.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get('categoryId')?.trim()
    if (!categoryId) {
      return NextResponse.json({ message: 'categoryId is required.' }, { status: 400 })
    }

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/category/${encodeURIComponent(categoryId)}`, { method: 'DELETE' })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete category.' }, { status: 500 })
  }
}
