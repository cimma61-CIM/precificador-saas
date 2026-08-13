const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

const rootDir = path.resolve(__dirname, '..', '..')
const defaultEnvPath = path.join(rootDir, 'server', '.env')
const officialUrl = 'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json'

function usage() {
  return 'Uso: ncmCatalog.js check [--env-file server/.env.bootstrap-test] | update --catalog-dir <diretorio-revisado> [--env-file server/.env.bootstrap-test]'
}

function resolveProjectPath(value, optionName, description) {
  const resolvedPath = path.resolve(rootDir, value)
  const relativePath = path.relative(rootDir, resolvedPath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`${optionName} deve apontar para ${description} dentro do projeto.`)
  }
  return resolvedPath
}

function parseArguments() {
  const args = process.argv.slice(2)
  const operation = args[0]
  if (!['check', 'update'].includes(operation)) throw new Error(usage())

  let envFile = defaultEnvPath
  let catalogDir = null
  let hasEnvFile = false

  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index]
    const value = args[index + 1]

    if (argument === '--env-file') {
      if (hasEnvFile || !value || value.startsWith('--')) throw new Error(usage())
      envFile = resolveProjectPath(value, '--env-file', 'um arquivo')
      hasEnvFile = true
      index += 1
      continue
    }

    if (argument === '--catalog-dir' && operation === 'update') {
      if (catalogDir || !value || value.startsWith('--')) throw new Error(usage())
      catalogDir = resolveProjectPath(value, '--catalog-dir', 'um diretorio')
      index += 1
      continue
    }

    throw new Error(usage())
  }

  if (operation === 'update' && !catalogDir) throw new Error(usage())
  return { operation, envFile, catalogDir }
}

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex') }
function normalizeCode(value) { return String(value || '').replace(/\D/g, '') }
function parseCatalog(payload) {
  const rows = Array.isArray(payload.Nomenclaturas) ? payload.Nomenclaturas : []
  const active = rows.filter((row) => row.Data_Fim === '31/12/9999')
    .map((row) => ({ codigo: String(row.Codigo || '').trim(), chave: normalizeCode(row.Codigo), descricao: String(row.Descricao || '').trim() }))
    .filter((row) => row.chave.length === 8 && row.descricao)
  const duplicateCodes = active.length - new Set(active.map((row) => row.chave)).size
  if (!rows.length || duplicateCodes) throw new Error('Catalogo oficial invalido: nomenclaturas ausentes ou codigos terminais duplicados.')
  const canonical = [...active].sort((a, b) => a.chave.localeCompare(b.chave))
  return { rows, active: canonical, duplicateCodes }
}
function sourceVersion(payload, payloadHash) {
  const sourceLastUpdate = String(payload.Data_Ultima_Atualizacao_NCM || '').trim() || 'sem-vigencia-informada'
  return { sourceLastUpdate, version: `${sourceLastUpdate}-${payloadHash.slice(0, 12)}`.replace(/\s+/g, '-').toLowerCase() }
}
async function loadEnv(envFile) {
  let content
  try {
    content = await fs.readFile(envFile, 'utf8')
  } catch {
    throw new Error('Arquivo de ambiente nao pode ser lido.')
  }
  return dotenv.parse(content)
}
function databaseConfig(env) {
  const url = String(env.DATABASE_URL || '').trim()
  if (!url) throw new Error('DATABASE_URL ausente no arquivo de ambiente.')
  const host = new URL(url).hostname.toLowerCase()
  return { connectionString: url, ssl: ['localhost', '127.0.0.1', '::1'].includes(host) ? false : { rejectUnauthorized: false } }
}
async function recordRun(pool, operationName, result, report, versionId = null, error = null) {
  await pool.query(`INSERT INTO ncm_catalog_runs (operacao, versao_id, finalizado_em, resultado, relatorio, erro)
    VALUES ($1, $2, NOW(), $3, $4::jsonb, $5)`, [operationName, versionId, result, JSON.stringify(report), error])
}
async function upsertVersion(pool, metadata, review = {}) {
  const result = await pool.query(`INSERT INTO ncm_catalog_versions
    (versao, fonte_url, vigencia_fonte, hash_payload, hash_catalogo, obtido_em, revisado_em, revisado_por, status_revisao, total_registros, total_codigos_ativos)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (versao) DO UPDATE SET fonte_url = EXCLUDED.fonte_url, vigencia_fonte = EXCLUDED.vigencia_fonte,
      hash_payload = EXCLUDED.hash_payload, hash_catalogo = EXCLUDED.hash_catalogo, obtido_em = EXCLUDED.obtido_em,
      revisado_em = COALESCE(EXCLUDED.revisado_em, ncm_catalog_versions.revisado_em),
      revisado_por = COALESCE(EXCLUDED.revisado_por, ncm_catalog_versions.revisado_por),
      status_revisao = CASE WHEN EXCLUDED.status_revisao = 'aprovado' THEN 'aprovado' ELSE ncm_catalog_versions.status_revisao END
    RETURNING id`, [metadata.version, metadata.url, metadata.sourceLastUpdate, metadata.payloadHash, metadata.catalogHash, metadata.obtainedAt,
    review.reviewedAt || null, review.reviewedBy || null, review.status || 'pendente', metadata.rawRecords, metadata.activeRecords])
  return result.rows[0].id
}
async function fetchOfficial() {
  const response = await fetch(officialUrl, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`Fonte oficial respondeu HTTP ${response.status}.`)
  const raw = Buffer.from(await response.arrayBuffer())
  return { payload: JSON.parse(raw.toString('utf8')), raw }
}
async function readReviewedCatalog(catalogDir) {
  const manifestPath = path.join(catalogDir, 'manifest.json')
  let manifest
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Atualizacao recusada: diretorio revisado deve conter manifest.json.')
    if (error instanceof SyntaxError) throw new Error('Atualizacao recusada: manifest.json invalido.')
    throw new Error('Atualizacao recusada: manifest.json nao pode ser lido.')
  }

  if (!manifest || typeof manifest !== 'object' || !manifest.artifacts || typeof manifest.artifacts !== 'object') {
    throw new Error('Atualizacao recusada: manifest deve conter o objeto artifacts.')
  }
  if (typeof manifest.artifacts.sourceJson !== 'string' || !manifest.artifacts.sourceJson.trim()) {
    throw new Error('Atualizacao recusada: manifest.artifacts.sourceJson deve ser uma string nao vazia.')
  }
  if (typeof manifest.artifacts.sql !== 'string' || !manifest.artifacts.sql.trim()) {
    throw new Error('Atualizacao recusada: manifest.artifacts.sql deve ser uma string nao vazia.')
  }
  if (manifest.review?.status !== 'approved' || !manifest.review?.reviewedAt || !manifest.review?.reviewedBy) {
    throw new Error('Atualizacao recusada: manifest deve ter review aprovada, data e responsavel.')
  }

  const sourcePath = path.resolve(catalogDir, manifest.artifacts.sourceJson)
  const sourceRelativePath = path.relative(catalogDir, sourcePath)
  if (sourceRelativePath.startsWith('..') || path.isAbsolute(sourceRelativePath)) {
    throw new Error('Atualizacao recusada: manifest.artifacts.sourceJson deve apontar para um arquivo dentro do diretorio revisado.')
  }

  let raw
  try {
    raw = await fs.readFile(sourcePath)
  } catch {
    throw new Error('Atualizacao recusada: arquivo indicado por manifest.artifacts.sourceJson nao pode ser lido.')
  }
  return { manifest, raw }
}
async function check(pool) {
  const { payload, raw } = await fetchOfficial()
  const catalog = parseCatalog(payload)
  const payloadHash = sha256(raw)
  const source = sourceVersion(payload, payloadHash)
  const metadata = { version: source.version, url: officialUrl, sourceLastUpdate: source.sourceLastUpdate, payloadHash,
    catalogHash: sha256(JSON.stringify(catalog.active)), obtainedAt: new Date().toISOString(), rawRecords: catalog.rows.length, activeRecords: catalog.active.length }
  const current = await pool.query('SELECT codigo, descricao FROM ncm')
  const currentByCode = new Map()
  for (const row of current.rows) {
    const key = normalizeCode(row.codigo)
    if (!currentByCode.has(key)) currentByCode.set(key, [])
    currentByCode.get(key).push(row)
  }
  const officialCodes = new Set(catalog.active.map((row) => row.chave))
  const additions = catalog.active.filter((row) => !currentByCode.has(row.chave)).length
  const descriptionChanges = catalog.active.filter((row) => currentByCode.has(row.chave) &&
    currentByCode.get(row.chave).some((currentRow) => currentRow.descricao !== row.descricao)).length
  const discontinuedInSource = current.rows.filter((row) => !officialCodes.has(normalizeCode(row.codigo))).length
  const versionId = await upsertVersion(pool, metadata)
  const report = { operation: 'check', changedCatalog: false, ...metadata, duplicateTerminalCodes: catalog.duplicateCodes,
    currentCatalogRecords: current.rows.length, additions, descriptionChanges, discontinuedInSource }
  await recordRun(pool, 'check', 'sucesso', report, versionId)
  console.log(JSON.stringify(report, null, 2))
}
async function update(pool, reviewedCatalog) {
  const { manifest, raw } = reviewedCatalog
  let payload
  try {
    payload = JSON.parse(raw.toString('utf8'))
  } catch {
    throw new Error('Atualizacao recusada: sourceJson contem JSON invalido.')
  }
  const catalog = parseCatalog(payload)
  const payloadHash = sha256(raw)
  const source = sourceVersion(payload, payloadHash)
  const metadata = { version: source.version, url: manifest.url || officialUrl, sourceLastUpdate: source.sourceLastUpdate, payloadHash,
    catalogHash: sha256(JSON.stringify(catalog.active)), obtainedAt: manifest.obtainedAtUtc || new Date().toISOString(), rawRecords: catalog.rows.length, activeRecords: catalog.active.length }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const versionId = await upsertVersion(client, metadata, { status: 'aprovado', reviewedAt: manifest.review.reviewedAt, reviewedBy: manifest.review.reviewedBy })
    const current = await client.query('SELECT codigo, descricao FROM ncm')
    const currentByCode = new Map()
    for (const row of current.rows) {
      const key = normalizeCode(row.codigo)
      if (!currentByCode.has(key)) currentByCode.set(key, [])
      currentByCode.get(key).push(row)
    }

    let inserted = 0
    let updated = 0
    for (const item of catalog.active) {
      const matchingRows = currentByCode.get(item.chave) || []
      if (matchingRows.length === 0) {
        await client.query('INSERT INTO ncm (codigo, descricao) VALUES ($1, $2)', [item.codigo, item.descricao])
        inserted += 1
        continue
      }

      const rowsWithChangedDescription = matchingRows.filter((row) => row.descricao !== item.descricao)
      if (rowsWithChangedDescription.length > 0) {
        for (const row of rowsWithChangedDescription) {
          await client.query('UPDATE ncm SET descricao = $2 WHERE codigo = $1', [row.codigo, item.descricao])
        }
        updated += 1
      }
    }
    const report = { operation: 'update', changedCatalog: true, version: metadata.version, catalogHash: metadata.catalogHash,
      inserted, updated, preservedDiscontinuedCodes: true, previousCatalogRecords: current.rows.length }
    await recordRun(client, 'update', 'sucesso', report, versionId)
    await client.query('COMMIT')
    console.log(JSON.stringify(report, null, 2))
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}
async function main() {
  const { operation, envFile, catalogDir } = parseArguments()
  const reviewedCatalog = operation === 'update' ? await readReviewedCatalog(catalogDir) : null
  const pool = new Pool(databaseConfig(await loadEnv(envFile)))
  try { await (operation === 'check' ? check(pool) : update(pool, reviewedCatalog)) } catch (error) {
    try { await recordRun(pool, operation, 'falha', { operation, changedCatalog: false }, null, error.message) } catch (_) {}
    throw error
  } finally { await pool.end() }
}
main().catch((error) => { console.error(`Falha NCM: ${error.message}`); process.exitCode = 1 })
