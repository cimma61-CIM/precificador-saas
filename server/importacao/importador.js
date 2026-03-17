const pool = require('../db')
const parseExcel = require('./parserExcel')
const parseCsv = require('./parserCSV')
const parseXml = require('./parserXML')
const parseMarketplace = require('./parserMarketplace')
const normalizarProduto = require('./normalizarProduto')
const validarProduto = require('./validarProduto')
const detectarDuplicados = require('./detectarDuplicados')
const inserirProdutos = require('./inserirProdutos')
const criarRelatorioImportacao = require('./relatorioImportacao')
const {
  normalizarChaveCategoria,
  normalizarNomeCategoria,
  slugifyCategoria
} = require('../utils/categorias')

const MAX_PRODUTOS_IMPORTACAO = 50

function createValidationError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function detectarTipoArquivo(arquivo = {}) {
  const nome = String(arquivo.originalname || '').toLowerCase()
  const mimetype = String(arquivo.mimetype || '').toLowerCase()

  if (nome.endsWith('.xlsx') || mimetype.includes('spreadsheetml')) {
    return 'excel'
  }

  if (nome.endsWith('.csv') || mimetype.includes('csv') || mimetype === 'application/vnd.ms-excel') {
    return 'csv'
  }

  if (nome.endsWith('.xml') || mimetype.includes('xml')) {
    return 'xml'
  }

  return 'desconhecido'
}

async function parseArquivo(arquivo, origem = null) {
  const tipo = origem || detectarTipoArquivo(arquivo)

  if (tipo === 'excel') {
    return parseExcel(arquivo)
  }

  if (tipo === 'csv') {
    return parseCsv(arquivo)
  }

  if (tipo === 'xml') {
    return parseXml(arquivo)
  }

  if (tipo === 'marketplace') {
    return parseMarketplace(arquivo)
  }

  throw createValidationError('Formato de arquivo nao suportado')
}

function filtrarLinhasVazias(produtos) {
  return produtos.filter((produto) => (
    produto &&
    Object.entries(produto)
      .filter(([key]) => key !== 'linha')
      .some(([, value]) => String(value || '').trim() !== '')
  ))
}

function normalizarEValidarProdutos(produtos, { tolerarErros = false } = {}) {
  const validos = []
  const erros = []

  for (const produto of produtos) {
    try {
      const normalizado = normalizarProduto(produto, { linha: produto.linha })
      validarProduto(normalizado)
      validos.push(normalizado)
    } catch (error) {
      if (!tolerarErros) {
        throw error.statusCode ? error : createValidationError(error.message)
      }

      erros.push({
        linha: produto.linha || 0,
        sku: produto.sku || '',
        nome: produto.nome || '',
        ean: produto.ean || '',
        erro: error.message
      })
    }
  }

  return { validos, erros }
}

async function carregarCategoriasPorNome(db, usuarioId, produtos) {
  const categoriasInformadas = produtos
    .map((produto) => produto.categoria)
    .filter(Boolean)
  const slugs = [...new Set(categoriasInformadas.map((nome) => slugifyCategoria(nome)).filter(Boolean))]
  const nomesNormalizados = [...new Set(categoriasInformadas.map((nome) => normalizarNomeCategoria(nome).toLowerCase()).filter(Boolean))]

  if (!slugs.length && !nomesNormalizados.length) {
    return new Map()
  }

  const result = await db.query(
    `
    SELECT id, nome, slug
    FROM categorias
    WHERE usuario_id = $1
      AND (
        (array_length($2::text[], 1) IS NOT NULL AND LOWER(COALESCE(slug, '')) = ANY($2::text[]))
        OR (
          array_length($3::text[], 1) IS NOT NULL
          AND LOWER(REGEXP_REPLACE(TRIM(nome), '\s+', ' ', 'g')) = ANY($3::text[])
        )
      )
    `,
    [usuarioId, slugs, nomesNormalizados]
  )

  const categoriasPorNome = new Map()

  for (const row of result.rows) {
    const chaves = new Set([
      normalizarChaveCategoria(row.nome),
      normalizarChaveCategoria(row.slug)
    ])

    for (const chave of chaves) {
      if (chave) {
        categoriasPorNome.set(chave, row.id)
      }
    }
  }

  return categoriasPorNome
}

async function criarCategoriaSeNecessario(db, usuarioId, nomeCategoria) {
  const nome = normalizarNomeCategoria(nomeCategoria)
  const slug = slugifyCategoria(nome)

  if (!nome || !slug) {
    return null
  }

  try {
    const result = await db.query(
      `
      INSERT INTO categorias (nome, slug, descricao, tipo_canal, marketplace_id, usuario_id, ativa)
      VALUES ($1, $2, NULL, 'loja_virtual', NULL, $3, true)
      RETURNING id
      `,
      [nome, slug, usuarioId]
    )

    return result.rows[0]?.id || null
  } catch (error) {
    if (error.code !== '23505') {
      throw error
    }

    const existente = await db.query(
      `
      SELECT id
      FROM categorias
      WHERE usuario_id = $1
        AND LOWER(COALESCE(slug, '')) = $2
      LIMIT 1
      `,
      [usuarioId, slug]
    )

    return existente.rows[0]?.id || null
  }
}

async function garantirCategorias(db, usuarioId, produtos, categoriasPorNome) {
  const categoriasPendentes = new Map()

  for (const produto of produtos) {
    const chave = normalizarChaveCategoria(produto.categoria)

    if (!chave || categoriasPorNome.has(chave) || categoriasPendentes.has(chave)) {
      continue
    }

    categoriasPendentes.set(chave, normalizarNomeCategoria(produto.categoria))
  }

  for (const [chave, nomeCategoria] of categoriasPendentes.entries()) {
    const categoriaId = await criarCategoriaSeNecessario(db, usuarioId, nomeCategoria)

    if (categoriaId) {
      categoriasPorNome.set(chave, categoriaId)
    }
  }
}

async function resolverCategorias(db, usuarioId, produtos, errosExistentes = []) {
  const categoriasPorNome = await carregarCategoriasPorNome(db, usuarioId, produtos)
  await garantirCategorias(db, usuarioId, produtos, categoriasPorNome)
  const validos = []
  const erros = [...errosExistentes]

  for (const produto of produtos) {
    const categoriaKey = normalizarChaveCategoria(produto.categoria)
    const categoriaId = categoriaKey ? categoriasPorNome.get(categoriaKey) || null : null

    if (categoriaKey && !categoriaId) {
      erros.push({
        linha: produto.linha,
        sku: produto.sku,
        nome: produto.nome,
        ean: produto.ean,
        erro: `Categoria "${produto.categoria}" nao encontrada`
      })
      continue
    }

    validos.push({
      ...produto,
      categoria_id: categoriaId
    })
  }

  return { validos, erros }
}

async function prepararProdutos(usuarioId, arquivo, options = {}) {
  const produtosBrutos = filtrarLinhasVazias(await parseArquivo(arquivo, options.origem))

  if (!produtosBrutos.length) {
    throw createValidationError('O arquivo nao possui produtos validos')
  }

  if (produtosBrutos.length > MAX_PRODUTOS_IMPORTACAO) {
    throw createValidationError(`A importacao permite no maximo ${MAX_PRODUTOS_IMPORTACAO} produtos por arquivo`)
  }

  const { validos, erros: errosValidacao } = normalizarEValidarProdutos(produtosBrutos, {
    tolerarErros: options.tolerarErros || false
  })

  return { validos, errosValidacao, totalProcessado: produtosBrutos.length }
}

async function analisarArquivo(usuarioId, arquivo, options = {}) {
  const { validos } = await prepararProdutos(usuarioId, arquivo, options)
  const duplicados = await detectarDuplicados(usuarioId, validos)

  return {
    novos: duplicados.novos.length,
    existentes: duplicados.atualizaveis.length,
    skusExistentes: duplicados.skusExistentes
  }
}

async function importarArquivo(usuarioId, arquivo, options = {}) {
  const { validos, errosValidacao, totalProcessado } = await prepararProdutos(usuarioId, arquivo, {
    ...options,
    tolerarErros: true
  })
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const categoriasResolvidas = await resolverCategorias(client, usuarioId, validos, errosValidacao)
    const duplicados = await detectarDuplicados(usuarioId, categoriasResolvidas.validos)
    const erros = [...categoriasResolvidas.erros, ...duplicados.erros]
    const produtosParaPersistir = [
      ...duplicados.novos.map((produto) => ({ ...produto, acao: 'insert' })),
      ...duplicados.atualizaveis.map((produto) => ({ ...produto, acao: 'update' }))
    ]
    const { inseridos, atualizados } = await inserirProdutos(client, usuarioId, produtosParaPersistir)
    await client.query('COMMIT')

    const relatorio = criarRelatorioImportacao({
      totalProcessado,
      inseridos,
      atualizados,
      erros
    })

    return {
      importados: inseridos,
      atualizados,
      erros: relatorio.erros,
      relatorio
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

module.exports = {
  MAX_PRODUTOS_IMPORTACAO,
  analisarArquivo,
  createValidationError,
  detectarTipoArquivo,
  importarArquivo
}
