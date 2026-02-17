/** @type {import('next').NextConfig} */
const apiBaseURL = process.env.GUILD_ADS_API_URL ?? 'http://localhost:3001'

const nextConfig = {
  // Output standalone for Render deployment
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: `${apiBaseURL}/v1/:path*`,
      },
      {
        source: '/r/:path*',
        destination: `${apiBaseURL}/r/:path*`,
      },
      {
        source: '/health',
        destination: `${apiBaseURL}/health`,
      },
    ]
  },
}

module.exports = nextConfig
