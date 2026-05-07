import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'
import { getDefaultPathForUser } from '@/lib/auth/access'
import { decodeJwt } from '@/lib/auth/jwt'

export default async function HomePage() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get(AUTHENTICATION_TOKEN)?.value
  const user = authToken ? decodeJwt(authToken) : null

  redirect(getDefaultPathForUser(user))
}
