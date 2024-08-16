import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'
import { resolveTxt } from 'node:dns'


export async function dietsRoutes(app: FastifyInstance) {
    app.post('/', { preHandler: [checkSessionIdExists] }, async (request, reply) => {
        const createDietBodySchema = z.object({
            name: z.string(),
            description: z.string(),
            eat_at: z.string(),
            on_diet: z.boolean()
        })

        const { name, description, eat_at, on_diet } = createDietBodySchema.parse(request.body)
        let sessionId = request.cookies.sessionId

        let user = await knex('users').select().where({ session_id: sessionId }).first();

        await knex('diets').insert({
            id: randomUUID(),
            name,
            description,
            eat_at: eat_at,
            on_diet, 
            user_id: user?.id
        })

        return reply.status(201).send()
    })

    app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {

        let sessionId = request.cookies.sessionId

        const user = await knex('users').where('session_id', sessionId).first();
        
        const diets = await knex('diets').select().where('user_id', user?.id)

        return { diets }
    })

    app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request, reply) => {
        let sessionId = request.cookies.sessionId

        const user = await knex('users').select().where('session_id', sessionId).first()
        console.log(user)

        const getDietSchema = z.object({
            id: z.string().uuid()
        })

        const { id } = getDietSchema.parse(request.params)

        const verifyDietsExists = await knex('diets').where({
            user_id: user?.id, 
            id,   
        }).first()

        console.log(verifyDietsExists)

        if (!verifyDietsExists) {
            return reply.status(400).send({ message:'Invalid diet ID' })
        }

        const diet = await knex('diets').select().where('id', id).first()

        return { diet }

    })

    app.put('/:id', {preHandler: [checkSessionIdExists] }, async (request, reply) => {
        let sessionId = request.cookies.sessionId

        const user = await knex('users').select().where('session_id', sessionId).first()
        console.log(user)

        const getDietSchema = z.object({
            id: z.string().uuid()
        })

        const editDietBodySchema = z.object({
            name: z.string(),
            description: z.string(),
            eat_at: z.string(),
            on_diet: z.boolean()
        })

        const { id } = getDietSchema.parse(request.params)

        const verifyDietExistsForUser = await knex('diets').select().where('user_id', user?.id).andWhere('id', id).first()

        if (!verifyDietExistsForUser) {
            return reply.status(400).send({ message:'Invalid diet ID' })
        }

        const { name, description, eat_at, on_diet } = editDietBodySchema.parse(request.body)
    
        await knex('diets').where('id', id).update({
            name,
            description,
            eat_at: eat_at,
            on_diet
        })

        return reply.status(200).send()
    })

    app.delete('/:id', { preHandler: [checkSessionIdExists] }, async (request, reply) => {
        let sessionId = request.cookies.sessionId
        
        const user = await knex('users').select().where('session_id', sessionId).first()

        const deleteDietSchema = z.object({
            id: z.string().uuid()
        })

        const { id } = deleteDietSchema.parse(request.params)

        const verifyDietsFromUser = await knex('diest').select().where('id', id).andWhere('user_id', user?.id)

        if (!verifyDietsFromUser) {
            return reply.status(400).send({ message: 'Invalid diet ID' })
        }

        await knex('diets').delete().where('id', id)

        return reply.status(204).send()
    })

    app.get('/metrics', { preHandler: [checkSessionIdExists] }, async (request, reply) => {
        let sessionId = request.cookies.sessionId

        const user = await knex('users').select().where('session_id', sessionId).first()

        const totalDiets = await knex('diets').count().where('user_id', user?.id)

        const totalFollowDiets = await knex('diets').count('id', { as: 'total' }).where({
            user_id: user?.id,
            on_diet: true
        }).first()

        const totalOutDiets = await knex('diets').count('id', { as: 'total' }).where({
            user_id: user?.id,
            on_diet: false
        }).first()

        const lastInsertDiets = await knex('diets')
        .where('user_id', user?.id)
        .orderBy('created_at', 'desc')

        const { bestOnDietSequence } = lastInsertDiets.reduce(
            (acc, diet) => {
                if (diet.on_diet) {
                    acc.currentSequence += 1
                } else {
                    acc.currentSequence = 0
                }

                if (acc.currentSequence > acc.bestOnDietSequence) {
                    acc.bestOnDietSequence = acc.currentSequence
                }

                return acc
            }, 
            { bestOnDietSequence: 0, currentSequence: 0 },
        )

        return reply.send({
            totalDiets: totalDiets.length,
            totalFollowDiets: totalFollowDiets?.total, 
            totalOutDiets: totalOutDiets?.total,
            bestOnDietSequence
        })

    })
}