import fastify from 'fastify'
import { env } from './env'
import { app } from './app'
import { knex } from './database'

app.get('/hello', async () => {
  const tables = await knex('users').select('*')

  return tables
})

app
  .listen({
    port: env.PORT,
  })
  .then(() => {
    console.log('HTTP server Running')
  })
