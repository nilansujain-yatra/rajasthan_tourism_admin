import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

const CANCELLATION_POLICY_UPLOAD_URL = 'http://10.70.235.179:30204/rajasthan/api/v1/file/cancel-policy'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
  }

  try {
    const incoming = await request.formData()
    const formData = new FormData()
    const image = incoming.get('image') ?? incoming.get('file')

    if (!image) {
      return NextResponse.json({ message: 'image is required.' }, { status: 400 })
    }

    formData.append('image', image)

    const response = await fetch(CANCELLATION_POLICY_UPLOAD_URL, {
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
    const message = error instanceof Error ? error.message : 'Unable to upload cancellation policy attachment.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
