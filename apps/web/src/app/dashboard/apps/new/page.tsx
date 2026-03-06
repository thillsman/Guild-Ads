import { AddAppForm } from '@/components/apps/add-app-form'

type Role = 'advertiser' | 'publisher'

function parseRole(value: string | undefined): Role | null {
  if (value === 'advertiser' || value === 'publisher') {
    return value
  }

  return null
}

export default function AddAppPage({
  searchParams,
}: {
  searchParams?: { role?: string }
}) {
  return <AddAppForm role={parseRole(searchParams?.role)} />
}
