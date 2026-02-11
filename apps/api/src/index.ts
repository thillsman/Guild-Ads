import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveRoutes } from './routes/serve.js'
import { eventsRoutes } from './routes/events.js'
import { redirectRoutes } from './routes/redirect.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// API routes
app.route('/v1', serveRoutes)
app.route('/v1', eventsRoutes)
app.route('/', redirectRoutes)

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = parseInt(process.env.PORT || '3001', 10)

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`API server running on http://localhost:${info.port}`)
})
