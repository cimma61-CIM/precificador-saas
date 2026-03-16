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

async function carregarCategoriasPorNome(usuarioId, produtos) {
  const nomes = [...new Set(produtos.map((produto) => produto.categoria).filter(Boolean).map((nome) => nome.toLowerCase()))]

  if (!nomes.length) {
    return new Map()
  }

  const result = await pool.query(
    `
    SELECT id, nome
    FROM categorias
    WHERE usuario_id = $1
      AND LOWER(nome) = ANY($2::text[])
    `,
    [usuarioId, nomes]
  )

  return new Map(result.rows.map((row) => [String(row.nome).trim().toLowerCase(), row.id]))
}

async function resolverCategorias(usuarioId, produtos, errosExistentes = []) {
  const categoriasPorNome = await carregarCategoriasPorNome(usuarioId, produtos)
  const validos = []
  const erros = [...errosExistentes]

  for (const produto of produtos) {
    const categoriaKey = produto.categoria ? produto.categoria.toLowerCase() : ''
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
  const categoriasResolvidas = await resolverCategorias(usuarioId, validos, errosValidacao)
  const duplicados = await detectarDuplicados(usuarioId, categoriasResolvidas.validos)
  const erros = [...categoriasResolvidas.erros, ...duplicados.erros]
  const produtosParaPersistir = [
    ...duplicados.novos.map((produto) => ({ ...produto, acao: 'insert' })),
    ...duplicados.atualizaveis.map((produto) => ({ ...produto, acao: 'update' }))
  ]

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
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
