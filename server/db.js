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

// Determinar configuração de conexão com prioridade clara
const getConnectionConfig = () => {
  // Prioridade 1: DATABASE_URL se definido e não vazio
  const dbUrl = String(process.env.DATABASE_URL || '').trim()
  if (dbUrl && dbUrl.length > 0 && dbUrl !== 'postgres://') {
    return {
      connectionString: dbUrl,
      ssl: resolveSslConfig()
    }
  }

  // Prioridade 2: Variáveis individuais DB_* se definidas
  const dbUser = String(process.env.DB_USER || '').trim()
  const dbHost = String(process.env.DB_HOST || '').trim()
  const dbName = String(process.env.DB_NAME || '').trim()
  const dbPassword = String(process.env.DB_PASSWORD || '').trim()
  const dbPort = String(process.env.DB_PORT || '5432').trim()

  if (dbUser && dbHost && dbName) {
    return {
      user: dbUser,
      host: dbHost,
      database: dbName,
      password: dbPassword,
      port: parseInt(dbPort, 10) || 5432,
      ssl: resolveSslConfig()
    }
  }

  // Fallback: Credenciais default (deve ser raro)
  console.warn('[db] Usando credenciais padrão - configure DATABASE_URL ou DB_* no .env')
  return {
    user: 'postgres',
    host: 'localhost',
    database: 'precificador',
    password: 'postgres123',
    port: 5432,
    ssl: resolveSslConfig()
  }
}

const pool = new Pool(getConnectionConfig())

module.exports = pool
