/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output only for production deploys.
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
}

module.exports = nextConfig
