import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/health', () => ({ ok: true, service: 'larispos-backend' }))
  .get('/api/v1/health', () => ({ ok: true, service: 'larispos-backend' }))
  .onError(({ error, code }) => {
    const message = error instanceof Error ? error.message : String(error)
    return { error: { code, message } }
  })

const port = Number(process.env.API_PORT || 3001)

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})

export type App = typeof app
