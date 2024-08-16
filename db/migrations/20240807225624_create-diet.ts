import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('diets', (table) => {
        table.uuid('id').primary()
        table.text('name').notNullable()
        table.text('description').notNullable()
        table.timestamp('eat_at').notNullable()
        table.boolean('on_diet').notNullable()
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('diets')
}

