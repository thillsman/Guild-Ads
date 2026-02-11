export default function DashboardPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Dashboard</h1>
      <p>Select your role:</p>
      <nav>
        <ul>
          <li><a href="/dashboard/advertiser">Advertiser Dashboard</a></li>
          <li><a href="/dashboard/publisher">Publisher Dashboard</a></li>
        </ul>
      </nav>
    </main>
  )
}
