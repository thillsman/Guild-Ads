import { LoginForm } from '@/components/auth/login-form'

type Role = 'advertiser' | 'publisher'

function parseRole(value: string | undefined): Role | null {
  if (value === 'advertiser' || value === 'publisher') {
    return value
  }

  return null
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { role?: string }
}) {
  return <LoginForm role={parseRole(searchParams?.role)} />
}
