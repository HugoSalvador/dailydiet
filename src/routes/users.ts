import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { FastifyInstance } from 'fastify'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'


export async function usersRoutes(app: FastifyInstance) {
    app.get('/',{ preHandler: [checkSessionIdExists] }, async (request) => {
        const users = await knex('users').select()

        return { users }
    }) 

    app.post('/', async (request, reply) => {
        const createUsersBodySchema = z.object({
            name: z.string(),
            email: z.string()
        })

        const { name, email } = createUsersBodySchema.parse(request.body)

        let sessionId = request.cookies.sessionId

        if (!sessionId) {
            sessionId = randomUUID()

            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, //7 days 
            })
        }

        await knex('users').insert({
            id: randomUUID(),
            name,
            email,
            session_id: sessionId
        })

        return reply.status(201).send()
    })
}