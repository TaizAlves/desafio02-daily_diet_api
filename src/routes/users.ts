import { randomUUID } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const createUserSchema = z.object({
      username: z.string(),
      email: z.string(),
    })

    const { username, email } = createUserSchema.parse(req.body)

    const checkIfUserExist = await knex('users').where('email', email).first()

    if (checkIfUserExist) {
      return reply.status(400).send({ error: 'Usuário já existe' })
    }

    const id = randomUUID()

    let sessionId = req.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/meals', // apenas as rotas /meals podem acessar ao cookie
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('users').insert({
      id,
      username,
      email,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
}
