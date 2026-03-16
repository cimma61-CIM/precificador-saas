const { Pool } = require('pg')
require('./config/loadEnv')

function getDatabaseHost() {
  if (process.env.DB_HOST) {
    return String(process.env.DB_HOST).trim().toLowerCase()
  }

  if (process.env.PGHOST) {
    return String(process.env.PGHOST).trim().toLowerCase()
  }

  if (process.env.DATABASE_URL) {
    try {
      const parsedUrl = new URL(process.env.DATABASE_URL)
      return String(parsedUrl.hostname || '').trim().toLowerCase()
    } catch (error) {
      return ''
    }
  }

  return 'localhost'
}

function resolveSslConfig() {
  const dbSsl = String(process.env.DB_SSL || '').trim().toLowerCase()

  if (dbSsl === 'true') {
    return { rejectUnauthorized: false }
  }

  if (dbSsl === 'false') {
    return false
  }

  const host = getDatabaseHost()
  const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

  return localHosts.has(host)
    ? false
    : { rejectUnauthorized: false }
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: resolveSslConfig()
      }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'precificador',
        password: 'postgres123',
        port: 5432,
        ssl: resolveSslConfig()
      }
)

module.exports = pool
