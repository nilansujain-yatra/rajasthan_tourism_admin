import { NextResponse } from 'next/server'
import { getAuthToken } from '../_utils'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const authToken = await getAuthToken()
  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 401 })
  }

  try {
    const incoming = await request.formData()
    const pdfFile = incoming.get('pdfFile') ?? incoming.get('file') ?? incoming.get('image')

    if (!(pdfFile instanceof File)) {
      return NextResponse.json({ message: 'pdfFile is required.' }, { status: 400 })
    }

    const formData = new FormData()
    formData.append('path', 'Driver')
    formData.append('pdfFile', pdfFile)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'}/file/driverGuideDoc`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
      cache: 'no-store',
    })

    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to upload driver document.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
