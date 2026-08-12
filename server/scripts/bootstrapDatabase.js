const fs = require('fs/promises')
const path = require('path')
const { spawn } = require('child_process')
const dotenv = require('dotenv')
const { Pool } = require('pg')

const rootDir = path.resolve(__dirname, '..', '..')
const bootstrapDir = path.join(rootDir, 'bootstrap', 'v1.1-schema-consolidado')
const defaultEnvPath = path.join(rootDir, 'server', '.env')
const cutoverTimestamp = '20260328100000'
const businessTables = [
  'usuarios', 'ncm', 'marketplaces', 'categorias', 'produtos', 'tipos_contato',
  'contatos', 'contato_tipos', 'historico_produtos', 'compras', 'compras_itens',
  'produto_fornecedor', 'produtos_marketplaces', 'taxas_marketplace'
]

function resolveSslConfig(environment, databaseUrl) {
  const dbSsl = String(environment.DB_SSL || '').trim().toLowerCase()

  if (dbSsl === 'true') return { rejectUnauthorized: false }
  if (dbSsl === 'false') return false

  const host = new URL(databaseUrl).hostname.trim().toLowerCase()
  return new Set(['localhost', '127.0.0.1', '::1']).has(host)
    ? false
    : { rejectUnauthorized: false }
}

function resolveEnvFileFromArgs() {
  const args = process.argv.slice(2)
  if (args.length === 0) return defaultEnvPath

  if (args.length !== 2 || args[0] !== '--env-file' || !args[1]) {
    throw new Error('Uso: node server/scripts/bootstrapDatabase.js [--env-file server/.env.bootstrap-test]')
  }

  const resolvedPath = path.resolve(rootDir, args[1])
  const relativePath = path.relative(rootDir, resolvedPath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Bootstrap recusado: --env-file deve apontar para um arquivo dentro do projeto.')
  }

  return resolvedPath
}

async function resolveBootstrapConfig(envFile) {
  let content
  try {
    content = await fs.readFile(envFile, 'utf8')
  } catch {
    throw new Error('Bootstrap recusado: arquivo de ambiente nao pode ser lido.')
  }

  const environment = dotenv.parse(content)
  const databaseUrl = String(environment.DATABASE_URL || '').trim()
  if (!databaseUrl) {
    throw new Error('Bootstrap recusado: DATABASE_URL ausente no arquivo de ambiente.')
  }

  try {
    const parsedUrl = new URL(databaseUrl)
    if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      throw new Error('invalid database URL')
    }
  } catch {
    throw new Error('Bootstrap recusado: DATABASE_URL no arquivo de ambiente e invalida.')
  }

  return { databaseUrl, ssl: resolveSslConfig(environment, databaseUrl), envFile }
}

function migrationEnvironment(databaseUrl, ssl) {
  const environment = { ...process.env, DATABASE_URL: databaseUrl }
  for (const key of ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE']) {
    delete environment[key]
  }
  environment.PGSSLMODE = ssl ? 'require' : 'disable'
  return environment
}

function run(command, args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: rootDir, stdio: 'inherit', env: environment })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Comando de migration falhou com codigo ${code}.`))
    })
  })
}

async function assertEmptyDatabase(client) {
  const result = await client.query(`
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND (c.relname = 'pgmigrations' OR c.relname = ANY($1::text[]))
    ORDER BY c.relname
  `, [businessTables])

  const names = result.rows.map((row) => row.name)
  if (names.length > 0) {
    throw new Error(`Bootstrap recusado: banco nao esta vazio (${names.join(', ')}). Nenhuma tabela foi alterada.`)
  }
}

async function applySql(client, relativePath) {
  const filePath = path.join(bootstrapDir, relativePath)
  const sql = await fs.readFile(filePath, 'utf8')
  await client.query(sql)
}

async function main() {
  const envFile = resolveEnvFileFromArgs()
  const config = await resolveBootstrapConfig(envFile)
  const manifest = JSON.parse(await fs.readFile(path.join(bootstrapDir, 'manifest.json'), 'utf8'))
  const pool = new Pool({ connectionString: config.databaseUrl, ssl: config.ssl })

  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await assertEmptyDatabase(client)

      for (const relativePath of manifest.schemaOrder) {
        await applySql(client, relativePath)
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }

    const migrationCli = path.join(rootDir, 'node_modules', 'node-pg-migrate', 'bin', 'node-pg-migrate.js')
    const commonArgs = ['--migrations-dir', 'server/migrations', '--envPath', config.envFile]
    const childEnvironment = migrationEnvironment(config.databaseUrl, config.ssl)
    await run(process.execPath, [migrationCli, 'up', cutoverTimestamp, '--timestamp', '--fake', ...commonArgs], childEnvironment)
    await run(process.execPath, [migrationCli, 'up', ...commonArgs], childEnvironment)
  } finally {
    await pool.end()
  }
}

main()
  .then(() => console.log('Bootstrap concluido com sucesso.'))
  .catch((error) => {
    console.error(`Falha no bootstrap: ${error.message}`)
    process.exitCode = 1
  })
