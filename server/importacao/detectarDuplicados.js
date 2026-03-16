const pool = require('../db')

function buildLineError(produto, mensagem) {
  return {
    linha: produto.linha,
    sku: produto.sku,
    nome: produto.nome,
    ean: produto.ean,
    erro: mensagem
  }
}

async function detectarDuplicados(usuarioId, produtos) {
  const skus = [...new Set(produtos.map((produto) => produto.sku).filter(Boolean))]
  const eans = [...new Set(produtos.map((produto) => produto.ean).filter(Boolean))]
  const duplicadosNoArquivoPorSku = new Set()
  const duplicadosNoArquivoPorEan = new Set()
  const vistosSku = new Set()
  const vistosEan = new Set()

  for (const produto of produtos) {
    if (produto.sku) {
      if (vistosSku.has(produto.sku)) {
        duplicadosNoArquivoPorSku.add(produto.sku)
      }
      vistosSku.add(produto.sku)
    }

    if (produto.ean) {
      if (vistosEan.has(produto.ean)) {
        duplicadosNoArquivoPorEan.add(produto.ean)
      }
      vistosEan.add(produto.ean)
    }
  }

  let existentes = []

  if (skus.length || eans.length) {
    existentes = (
      await pool.query(
        `
        SELECT id, sku, ean
        FROM produtos
        WHERE usuario_id = $1
          AND (
            (array_length($2::text[], 1) IS NOT NULL AND sku = ANY($2::text[]))
            OR (array_length($3::text[], 1) IS NOT NULL AND ean = ANY($3::text[]))
          )
        `,
        [usuarioId, skus, eans]
      )
    ).rows
  }

  const existentesPorSku = new Map(existentes.filter((row) => row.sku).map((row) => [row.sku, row]))
  const existentesPorEan = new Map(existentes.filter((row) => row.ean).map((row) => [row.ean, row]))
  const erros = []
  const novos = []
  const atualizaveis = []
  const skusExistentes = []

  for (const produto of produtos) {
    if (duplicadosNoArquivoPorSku.has(produto.sku)) {
      erros.push(buildLineError(produto, 'SKU duplicado no arquivo'))
      continue
    }

    if (produto.ean && duplicadosNoArquivoPorEan.has(produto.ean)) {
      erros.push(buildLineError(produto, 'EAN duplicado no arquivo'))
      continue
    }

    const existentePorSku = existentesPorSku.get(produto.sku) || null
    const existentePorEan = produto.ean ? existentesPorEan.get(produto.ean) || null : null

    if (existentePorSku) {
      atualizaveis.push({
        ...produto,
        produto_id: existentePorSku.id,
        ean: produto.ean || existentePorSku.ean || ''
      })
      skusExistentes.push(produto.sku)
      continue
    }

    if (existentePorEan) {
      erros.push(buildLineError(produto, 'EAN ja cadastrado'))
      continue
    }

    novos.push(produto)
  }

  return {
    novos,
    atualizaveis,
    erros,
    skusExistentes: [...new Set(skusExistentes)],
    existentesPorSku,
    existentesPorEan
  }
}

module.exports = detectarDuplicados
