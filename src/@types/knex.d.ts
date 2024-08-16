import { Knex } from 'knex'

declare module 'knex/types/tables' {
    export interface Tables {
        users: {
            id: string,
            name: string, 
            email: string,
            created_at: string,
            session_id?: string,
        },

        diets: {
            id: string,
            name: string,
            description: string,
            eat_at: string,
            on_diet: boolean,
            user_id: string,
            created_at: string
        }
    }
}