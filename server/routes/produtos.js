const express = require('express')
const router = express.Router()
const pool = require('../db')
const {
  normalizarMarketplace,
  calcularPrecoComTaxas,
  normalizarPercentual,
  normalizarValorMonetario
} = require('../services/precoService')
const {
  recalcularProdutoPorId,
  recalcularTodosProdutos
} = require('../services/precificacaoService')

function calcularPrecoDireto(custo, margemDesejada) {
  const divisor = 1 - margemDesejada

  if (divisor <= 0) {
    throw new Error('Margem desejada nao pode ser 100% ou maior')
  }

  return Number((custo / divisor).toFixed(2))
}

function normalizarPrecoVenda(custo, precoVenda, margemDesejada) {
  const custoNormalizado = normalizarValorMonetario(custo, 'Custo')
  const possuiPreco = precoVenda !== undefined && precoVenda !== null && String(precoVenda).trim() !== ''
  const possuiMargem = margemDesejada !== undefined && margemDesejada !== null && String(margemDesejada).trim() !== ''

  if (possuiPreco) {
    return {
      precoVenda: normalizarValorMonetario(precoVenda, 'Preco de venda'),
      margemDesejada: 0
    }
  }

  if (possuiMargem) {
    const margemNormalizada = normalizarPercentual(margemDesejada)

    return {
      precoVenda: calcularPrecoDireto(custoNormalizado, margemNormalizada),
      margemDesejada: margemNormalizada
    }
  }

  return {
    precoVenda: 0,
    margemDesejada: 0
  }
}

function enriquecerMarketplace(row, custo) {
  const marketplace = {
    id: row.marketplace_id,
    nome: row.nome,
    slug: row.slug,
    margem: Number(row.margem || 0),
    preco_calculado: Number(row.preco_calculado || 0),
    taxa_percentual: row.taxa_percentual === null ? null : Number(row.taxa_percentual || 0),
    taxa_fixa: Number(row.taxa_fixa || 0),
    frete_medio: Number(row.frete_medio || 0),
    indice_extra_percentual: Number(row.indice_extra_percentual || 0),
    imposto_percentual: Number(row.imposto_percentual || 0),
    taxa_configurada: row.taxa_percentual !== null,
    status: 'sem_taxa',
    status_label: 'Sem taxa',
    lucro_estimado: 0,
    margem_real: 0
  }

  if (!marketplace.taxa_configurada) {
    return marketplace
  }

  try {
    const taxa = {
      taxa_percentual: row.taxa_percentual,
      taxa_fixa: row.taxa_fixa,
      frete_medio: row.frete_medio,
      indice_extra_percentual: row.indice_extra_percentual,
      imposto_percentual: row.imposto_percentual
    }

    const calculo = calcularPrecoComTaxas({
      custo,
      margem: marketplace.margem,
      taxa
    })

    return {
      ...marketplace,
      status: 'calculado',
      status_label: 'Calculado',
      lucro_estimado: calculo.lucro,
      margem_real: calculo.margem_real
    }
  } catch (error) {
    return {
      ...marketplace,
      status: 'margem_invalida',
      status_label: 'Margem invalida'
    }
  }
}

async function resolverMarketplacesSelecionados(client, marketplacesInput, marketplaceLegado, margemPadrao) {
  const entradas = []

  if (Array.isArray(marketplacesInput)) {
    entradas.push(...marketplacesInput)
  }

  if (marketplaceLegado) {
    entradas.push(marketplaceLegado)
  }

  const marketPlaceMap = new Map()

  for (const entrada of entradas) {
    if (entrada === undefined || entrada === null || entrada === '') {
      continue
    }

    let chave = null
    let margemItem = margemPadrao

    if (typeof entrada === 'object') {
      if (entrada.id) {
        chave = `id:${Number(entrada.id)}`
      } else if (entrada.slug) {
        chave = `slug:${normalizarMarketplace(entrada.slug)}`
      }

      if (entrada.margem !== undefined && entrada.margem !== null && String(entrada.margem).trim() !== '') {
        margemItem = normalizarPercentual(entrada.margem)
      }
    } else {
      const numero = Number(entrada)

      if (Number.isInteger(numero) && numero > 0 && String(entrada).trim() === String(numero)) {
        chave = `id:${numero}`
      } else {
        chave = `slug:${normalizarMarketplace(entrada)}`
      }
    }

    if (chave) {
      marketPlaceMap.set(chave, margemItem)
    }
  }

  if (marketPlaceMap.size === 0) {
    return []
  }

  const ids = []
  const slugs = []

  for (const chave of marketPlaceMap.keys()) {
    if (chave.startsWith('id:')) {
      ids.push(Number(chave.slice(3)))
    } else if (chave.startsWith('slug:')) {
      slugs.push(chave.slice(5))
    }
  }

  const conditions = []
  const values = []

  if (ids.length > 0) {
    values.push(ids)
    conditions.push(`id = ANY($${values.length}::int[])`)
  }

  if (slugs.length > 0) {
    values.push(slugs)
    conditions.push(`slug = ANY($${values.length}::text[])`)
  }

  const result = await client.query(
    `
    SELECT id, nome, slug
    FROM marketplaces
    WHERE ${conditions.join(' OR ')}
    ORDER BY nome ASC
    `,
    values
  )

  return result.rows.map((row) => ({
    ...row,
    margem: marketPlaceMap.get(`id:${row.id}`) ?? marketPlaceMap.get(`slug:${row.slug}`) ?? margemPadrao
  }))
}

async function carregarProdutoComMarketplaces(client, usuarioId, produtoId) {
  const produtoResult = await client.query(
    `
    SELECT
      id,
      usuario_id,
      nome,
      barcode,
      ncm,
      custo,
      preco,
      preco_venda,
      quantidade,
      estoque_min,
      estoque_max,
      localizacao,
      descricao,
      marketplace,
      margem,
      margem_desejada
    FROM produtos
    WHERE id = $1
    AND usuario_id = $2
    LIMIT 1
    `,
    [produtoId, usuarioId]
  )

  if (produtoResult.rows.length === 0) {
    return null
  }

  const produto = produtoResult.rows[0]
  const marketplacesResult = await client.query(
    `
    SELECT
      pm.marketplace_id,
      pm.margem,
      pm.preco_calculado,
      m.nome,
      m.slug,
      tm.taxa_percentual,
      tm.taxa_fixa,
      tm.frete_medio,
      COALESCE(tm.indice_extra_percentual, 0) AS indice_extra_percentual,
      tm.imposto_percentual
    FROM produtos_marketplaces pm
    INNER JOIN marketplaces m
      ON m.id = pm.marketplace_id
    LEFT JOIN taxas_marketplace tm
      ON tm.marketplace_id = pm.marketplace_id
      AND tm.usuario_id = pm.usuario_id
    WHERE pm.produto_id = $1
    AND pm.usuario_id = $2
    ORDER BY m.nome ASC
    `,
    [produtoId, usuarioId]
  )

  const custo = Number(produto.custo || 0)

  return {
    ...produto,
    custo,
    preco: Number(produto.preco || 0),
    preco_venda: Number(produto.preco_venda || produto.preco || 0),
    margem: Number(produto.margem || 0),
    margem_desejada: Number(produto.margem_desejada || produto.margem || 0),
    marketplaces: marketplacesResult.rows.map((row) => enriquecerMarketplace(row, custo))
  }
}

async function salvarRelacoesProdutoMarketplaces(client, usuarioId, produtoId, marketplacesSelecionados) {
  await client.query(
    `
    DELETE FROM produtos_marketplaces
    WHERE produto_id = $1
    AND usuario_id = $2
    `,
    [produtoId, usuarioId]
  )

  for (const marketplaceItem of marketplacesSelecionados) {
    await client.query(
      `
      INSERT INTO produtos_marketplaces (
        produto_id,
        marketplace_id,
        usuario_id,
        margem,
        preco_calculado
      )
      VALUES ($1, $2, $3, $4, 0)
      `,
      [
        produtoId,
        marketplaceItem.id,
        usuarioId,
        marketplaceItem.margem
      ]
    )
  }
}

async function recalcularMarketplacesDoProduto(client, usuarioId, produtoId, custo) {
  const relacoesResult = await client.query(
    `
    SELECT
      pm.id,
      pm.marketplace_id,
      pm.margem,
      tm.taxa_percentual,
      tm.taxa_fixa,
      tm.frete_medio,
      COALESCE(tm.indice_extra_percentual, 0) AS indice_extra_percentual,
      tm.imposto_percentual
    FROM produtos_marketplaces pm
    LEFT JOIN taxas_marketplace tm
      ON tm.marketplace_id = pm.marketplace_id
      AND tm.usuario_id = pm.usuario_id
    WHERE pm.produto_id = $1
    AND pm.usuario_id = $2
    `,
    [produtoId, usuarioId]
  )

  for (const relacao of relacoesResult.rows) {
    let precoCalculado = 0

    if (relacao.taxa_percentual !== null) {
      try {
        const calculo = calcularPrecoComTaxas({
          custo,
          margem: relacao.margem,
          taxa: {
          taxa_percentual: relacao.taxa_percentual,
          taxa_fixa: relacao.taxa_fixa,
          frete_medio: relacao.frete_medio,
          indice_extra_percentual: relacao.indice_extra_percentual,
          imposto_percentual: relacao.imposto_percentual
        }
      })

        precoCalculado = calculo.preco_sugerido
      } catch (error) {
        precoCalculado = 0
      }
    }

    await client.query(
      `
      UPDATE produtos_marketplaces
      SET preco_calculado = $1
      WHERE id = $2
      AND usuario_id = $3
      `,
      [precoCalculado, relacao.id, usuarioId]
    )
  }
}

async function salvarProduto(req, res, modo) {
  const usuarioId = req.user.id
  const client = await pool.connect()

  try {
    const {
      nome,
      barcode = null,
      ncm = null,
      custo,
      preco,
      preco_venda,
      quantidade = 0,
      estoque_min = 0,
      estoque_max = 0,
      localizacao = null,
      descricao = null,
      marketplace = null,
      marketplaces = [],
      margem = 0,
      margem_desejada
    } = req.body

    if (!nome || custo === undefined || custo === null || String(custo).trim() === '') {
      return res.status(400).json({
        erro: 'Nome e custo sao obrigatorios'
      })
    }

    const produtoId = Number(req.params.id)

    if (modo === 'update' && (!Number.isInteger(produtoId) || produtoId <= 0)) {
      return res.status(400).json({ erro: 'ID invalido' })
    }

    const nomeNormalizado = String(nome).trim()
    const custoNormalizado = normalizarValorMonetario(custo, 'Custo')
    const margemInput = margem_desejada ?? margem
    const { precoVenda, margemDesejada } = normalizarPrecoVenda(
      custoNormalizado,
      preco_venda ?? preco,
      margemInput
    )

    await client.query('BEGIN')

    const marketplacesSelecionados = await resolverMarketplacesSelecionados(
      client,
      marketplaces,
      marketplace,
      margemDesejada
    )

    const marketplacePrincipal = marketplacesSelecionados[0]?.slug || null
    let produtoSalvoId = produtoId

    if (modo === 'create') {
      const produtoResult = await client.query(
        `
        INSERT INTO produtos (
          usuario_id,
          nome,
          barcode,
          ncm,
          custo,
          preco,
          preco_venda,
          quantidade,
          estoque_min,
          estoque_max,
          localizacao,
          descricao,
          marketplace,
          margem,
          margem_desejada
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
        `,
        [
          usuarioId,
          nomeNormalizado,
          barcode || null,
          ncm || null,
          custoNormalizado,
          precoVenda,
          precoVenda,
          Number(quantidade || 0),
          Number(estoque_min || 0),
          Number(estoque_max || 0),
          localizacao || null,
          descricao || null,
          marketplacePrincipal,
          margemDesejada,
          margemDesejada
        ]
      )

      produtoSalvoId = produtoResult.rows[0].id
    } else {
      const updateResult = await client.query(
        `
        UPDATE produtos
        SET
          nome = $1,
          barcode = $2,
          ncm = $3,
          custo = $4,
          preco = $5,
          preco_venda = $6,
          quantidade = $7,
          estoque_min = $8,
          estoque_max = $9,
          localizacao = $10,
          descricao = $11,
          marketplace = $12,
          margem = $13,
          margem_desejada = $14
        WHERE id = $15
        AND usuario_id = $16
        RETURNING id
        `,
        [
          nomeNormalizado,
          barcode || null,
          ncm || null,
          custoNormalizado,
          precoVenda,
          precoVenda,
          Number(quantidade || 0),
          Number(estoque_min || 0),
          Number(estoque_max || 0),
          localizacao || null,
          descricao || null,
          marketplacePrincipal,
          margemDesejada,
          margemDesejada,
          produtoId,
          usuarioId
        ]
      )

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ erro: 'Produto nao encontrado' })
      }
    }

    await salvarRelacoesProdutoMarketplaces(
      client,
      usuarioId,
      produtoSalvoId,
      marketplacesSelecionados
    )

    await recalcularMarketplacesDoProduto(
      client,
      usuarioId,
      produtoSalvoId,
      custoNormalizado
    )

    const produtoCompleto = await carregarProdutoComMarketplaces(
      client,
      usuarioId,
      produtoSalvoId
    )

    await client.query('COMMIT')

    return res.status(modo === 'create' ? 201 : 200).json({
      produto: produtoCompleto
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)

    if (err.message.includes('numero valido') || err.message.includes('Margem')) {
      return res.status(400).json({ erro: err.message })
    }

    return res.status(500).json({ erro: 'Erro ao salvar produto' })
  } finally {
    client.release()
  }
}

router.post('/', async (req, res) => salvarProduto(req, res, 'create'))

router.put('/:id', async (req, res) => salvarProduto(req, res, 'update'))

router.get('/buscar', async (req, res) => {
  const usuarioId = req.user.id
  const query = String(req.query.q || '').trim()

  if (query.length < 2) {
    return res.json({ produtos: [] })
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        nome,
        barcode,
        ncm,
        custo,
        preco_venda,
        descricao
      FROM produtos
      WHERE usuario_id = $1
      AND (
        nome ILIKE $2
        OR COALESCE(barcode, '') ILIKE $2
        OR COALESCE(ncm, '') ILIKE $2
      )
      ORDER BY nome ASC, id DESC
      LIMIT 10
      `,
      [usuarioId, `%${query}%`]
    )

    return res.json({
      produtos: result.rows.map((produto) => ({
        ...produto,
        custo: Number(produto.custo || 0),
        preco_venda: Number(produto.preco_venda || 0),
        descricao: produto.descricao || ''
      }))
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: 'Erro ao buscar sugestoes de produtos' })
  }
})

router.get('/', async (req, res) => {
  const usuarioId = req.user.id
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const requestedLimit = parseInt(req.query.limit, 10) || 50
  const limit = Math.min(Math.max(requestedLimit, 1), 200)
  const offset = (page - 1) * limit
  const busca = String(req.query.busca || '').trim()

  try {
    const filtroBusca = busca
      ? `
        AND (
          nome ILIKE $2
          OR COALESCE(barcode, '') ILIKE $2
          OR COALESCE(ncm, '') ILIKE $2
        )
      `
      : ''
    const totalParams = busca ? [usuarioId, `%${busca}%`] : [usuarioId]

    const totalResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM produtos
      WHERE usuario_id = $1
      ${filtroBusca}
      `,
      totalParams
    )

    const produtosParams = busca
      ? [usuarioId, `%${busca}%`, limit, offset]
      : [usuarioId, limit, offset]

    const produtosResult = await pool.query(
      `
      SELECT
        id,
        nome,
        barcode,
        ncm,
        custo,
        preco,
        preco_venda,
        quantidade,
        estoque_min,
        estoque_max,
        localizacao,
        descricao,
        marketplace,
        margem,
        margem_desejada
      FROM produtos
      WHERE usuario_id = $1
      ${
        busca
          ? `
            AND (
              nome ILIKE $2
              OR COALESCE(barcode, '') ILIKE $2
              OR COALESCE(ncm, '') ILIKE $2
            )
          `
          : ''
      }
      ORDER BY id DESC
      LIMIT $${busca ? 3 : 2} OFFSET $${busca ? 4 : 3}
      `,
      produtosParams
    )

    const produtos = produtosResult.rows
    const produtoIds = produtos.map((produto) => produto.id)
    const marketplacesPorProduto = new Map()

    if (produtoIds.length > 0) {
      const marketplacesResult = await pool.query(
        `
        SELECT
          pm.produto_id,
          pm.marketplace_id,
          pm.margem,
          pm.preco_calculado,
          m.nome,
          m.slug,
          tm.taxa_percentual,
          tm.taxa_fixa,
          tm.frete_medio,
          COALESCE(tm.indice_extra_percentual, 0) AS indice_extra_percentual,
          tm.imposto_percentual,
          p.custo
        FROM produtos_marketplaces pm
        INNER JOIN marketplaces m
          ON m.id = pm.marketplace_id
        INNER JOIN produtos p
          ON p.id = pm.produto_id
        LEFT JOIN taxas_marketplace tm
          ON tm.marketplace_id = pm.marketplace_id
          AND tm.usuario_id = pm.usuario_id
        WHERE pm.usuario_id = $1
        AND pm.produto_id = ANY($2::int[])
        ORDER BY m.nome ASC
        `,
        [usuarioId, produtoIds]
      )

      for (const row of marketplacesResult.rows) {
        if (!marketplacesPorProduto.has(row.produto_id)) {
          marketplacesPorProduto.set(row.produto_id, [])
        }

        marketplacesPorProduto.get(row.produto_id).push(
          enriquecerMarketplace(row, Number(row.custo || 0))
        )
      }
    }

    const total = totalResult.rows[0]?.total || 0
    const totalPages = Math.max(Math.ceil(total / limit), 1)

    return res.json({
      produtos: produtos.map((produto) => ({
        ...produto,
        custo: Number(produto.custo || 0),
        preco: Number(produto.preco || 0),
        preco_venda: Number(produto.preco_venda || produto.preco || 0),
        margem: Number(produto.margem || 0),
        margem_desejada: Number(produto.margem_desejada || produto.margem || 0),
        marketplaces: marketplacesPorProduto.get(produto.id) || []
      })),
      total,
      page,
      limit,
      totalPages
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: 'Erro ao buscar produtos' })
  }
})

router.post('/recalcular-precos', async (req, res) => {
  const usuarioId = req.user.id

  try {
    const resultado = await recalcularTodosProdutos(usuarioId)
    return res.json(resultado)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: err.message || 'Erro ao recalcular precos' })
  }
})

router.post('/:id/recalcular-precos', async (req, res) => {
  const usuarioId = req.user.id
  const produtoId = Number(req.params.id)

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const resultado = await recalcularProdutoPorId(usuarioId, produtoId)
    return res.json(resultado)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: err.message || 'Erro ao recalcular produto' })
  }
})

router.delete('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const result = await pool.query(
      'DELETE FROM produtos WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, usuarioId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Produto nao encontrado' })
    }

    return res.json({ mensagem: 'Produto removido com sucesso' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: 'Erro ao excluir produto' })
  }
})

module.exports = router
