import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'

import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (req, reply) => {
      const createMealsSchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean().default(false),
      })

      const { name, description, isOnDiet } = createMealsSchema.parse(req.body)

      const sessionIdSchema = z.object({
        sessionId: z.string().uuid(),
      })

      const { sessionId } = sessionIdSchema.parse(req.cookies)

      const user = await knex('users').where('session_id', sessionId).first()

      if (!user) {
        return reply.status(400).send({
          status: 'error',
          data: 'Session ID does not exist',
        })
      }

      const userId = user.id
      // console.log(userId)

      await knex('meals').insert({
        id: randomUUID(),
        name,
        description,
        isOnDiet,
        user_id: userId,
      })

      return reply.status(201).send()
    },
  )

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (req, reply) => {
      const { sessionId } = req.cookies

      const user = await knex('users').where('session_id', sessionId).first()

      if (!user) {
        return reply.status(400).send({
          status: 'error',
          data: 'Session ID does not exist',
        })
      }

      const userId = user.id

      const meals = await knex('meals').where('user_id', userId)

      return {
        status: 'success',
        data: meals,
      }
    },
  )

  app.get(
    '/:mealId',
    {
      preHandler: [checkSessionIdExists],
    },
    async (req, reply) => {
      const { sessionId } = req.cookies

      const user = await knex('users').where('session_id', sessionId).first()

      if (!user) {
        return reply.status(400).send({
          status: 'error',
          data: 'Session ID does not exist',
        })
      }

      const userId = user.id

      const getMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getMealParamsSchema.parse(req.params)
      // console.log(mealId)

      const meal = await knex('meals')
        .where('id', mealId)
        .andWhere('user_id', userId)
        .first()

      if (!meal) {
        return reply.status(404).send({
          error: 'Meal not found',
        })
      }

      return reply.status(200).send({
        data: meal || null,
      })
    },
  )

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (req, reply) => {
      const { sessionId } = req.cookies

      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const params = getMealParamsSchema.parse(req.params)

      const user = await knex('users').where('session_id', sessionId).first()

      const userId = user.id

      const meal = await knex('meals')
        .where('id', params.id)
        .andWhere('user_id', userId)
        .first()
        .delete()

      if (!meal) {
        return reply.status(400).send({
          error: 'Meal not found or unauthorized',
        })
      }

      return reply.status(202).send(`Meal deleted id: ${params.id}`)
    },
  )

  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (req, reply) => {
      const { sessionId } = req.cookies

      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const params = getMealParamsSchema.parse(req.params)

      const user = await knex('users').where('session_id', sessionId).first()

      const userId = user.id

      const editMealSchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
      })

      const { name, description, isOnDiet } = editMealSchema.parse(req.body)

      const meal = await knex('meals')
        .where('id', params.id)
        .andWhere('user_id', userId)
        .first()
        .update({
          name,
          description,
          isOnDiet,
        })

      if (!meal) {
        return reply.status(400).send({
          error: 'Meal not found',
        })
      }

      return reply.status(202).send()
    },
  )

  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (req, reply) => {
      const { sessionId } = req.cookies

      const user = await knex('users').where('session_id', sessionId).first()

      const userId = user.id

      const countAllMeals = await knex('meals')
        .count('id', { as: 'total meals' })
        .where('user_id', userId)

      const dietMeals = await knex('meals')
        .count('id', { as: 'total on diet meals' })
        .where('isOnDiet', true)
        .andWhere('user_id', userId)

      const bestonDietMeals = await knex('meals')
        .select('*')
        .where('isOnDiet', true)
        .andWhere('user_id', userId)

      const nonDietMeals = await knex('meals')
        .count('id', { as: 'total NOT diet meals' })
        .where('isOnDiet', false)
        .andWhere('user_id', userId)

      const dados = {
        countAllMeals,
        dietMeals,
        bestonDietMeals,
        nonDietMeals,
      }
      return { dados }
    },
  )
}
