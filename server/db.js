const { Pool } = require('pg')
require('./config/loadEnv')

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'precificador',
        password: 'postgres123',
        port: 5432
      }
)

module.exports = pool
