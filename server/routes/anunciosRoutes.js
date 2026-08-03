const express = require('express')
const router = express.Router()
const pool = require('../db')

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarNumero(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function normalizarInteiro(valor) {
  const numero = Number(valor)
  return Number.isInteger(numero) ? numero : null
}

function normalizarBoolean(valor, fallback = false) {
  if (valor === undefined) {
    return fallback
  }

  if (typeof valor === 'boolean') {
    return valor
  }

  const texto = String(valor || '').trim().toLowerCase()
  if (texto === 'true') {
    return true
  }

  if (texto === 'false') {
    return false
  }

  return fallback
}

function validarStatus(valor) {
  const status = String(valor || '').trim().toLowerCase()
  const validos = ['ativo', 'pausado', 'sem_estoque']
  return validos.includes(status) ? status : null
}

async function carregarProdutoPorId(produtoId, usuarioId) {
  const result = await pool.query(
    `
    SELECT id, nome, sku
    FROM produtos
    WHERE id = $1
      AND usuario_id = $2
    LIMIT 1
    `,
    [produtoId, usuarioId]
  )

  return result.rows[0] || null
}

async function carregarMarketplacePorId(marketplaceId) {
  const result = await pool.query(
    `
    SELECT id
    FROM marketplaces
    WHERE id = $1
    LIMIT 1
    `,
    [marketplaceId]
  )

  return result.rows.length > 0
}

async function carregarAnuncioPorId(anuncioId, usuarioId) {
  const result = await pool.query(
    `
    SELECT
      a.id,
      a.usuario_id,
      a.produto_id,
      a.marketplace_id,
      a.sku_anuncio,
      a.titulo,
      a.preco,
      a.estoque,
      a.status,
      a.tem_ads,
      a."full",
      a.em_promocao,
      p.nome AS produto_nome,
      p.sku AS produto_sku,
      m.nome AS marketplace_nome,
      a.created_at,
      a.updated_at
    FROM anuncios a
    INNER JOIN produtos p
      ON p.id = a.produto_id
    LEFT JOIN marketplaces m
      ON m.id = a.marketplace_id
    WHERE a.id = $1
      AND a.usuario_id = $2
    LIMIT 1
    `,
    [anuncioId, usuarioId]
  )

  return result.rows[0] || null
}

function montarRespostaAnuncio(row) {
  if (!row) {
    return null
  }

  return {
    ...row,
    produto_nome: row.produto_nome || null,
    produto_sku: row.produto_sku || null,
    marketplace_nome: row.marketplace_nome || null
  }
}

router.get('/', async (req, res) => {
  const usuarioId = req.user.id
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const requestedLimit = parseInt(req.query.limit, 10) || 100
  const limit = Math.min(Math.max(requestedLimit, 1), 200)
  const offset = (page - 1) * limit
  const busca = normalizarTexto(req.query.q || req.query.busca)
  const marketplaceId = normalizarInteiro(req.query.marketplace_id)
  const status = validarStatus(req.query.status)

  try {
    const params = [usuarioId]
    const filtros = ['a.usuario_id = $1']

    if (marketplaceId) {
      params.push(marketplaceId)
      filtros.push(`a.marketplace_id = $${params.length}`)
    }

    if (status) {
      params.push(status)
      filtros.push(`a.status = $${params.length}`)
    }

    if (busca) {
      params.push(`%${busca}%`)
      filtros.push(`(
        a.sku_anuncio ILIKE $${params.length}
        OR COALESCE(a.titulo, '') ILIKE $${params.length}
        OR p.nome ILIKE $${params.length}
      )`)
    }

    const whereClause = filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''

    const totalResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM anuncios a
      INNER JOIN produtos p
        ON p.id = a.produto_id
      ${whereClause}
      `,
      params
    )

    const listParams = [...params, limit, offset]
    const result = await pool.query(
      `
      SELECT
        a.id,
        a.produto_id,
        a.marketplace_id,
        a.sku_anuncio,
        a.titulo,
        a.preco,
        a.estoque,
        a.status,
        a.tem_ads,
        a."full",
        a.em_promocao,
        p.nome AS produto_nome,
        p.sku AS produto_sku,
        m.nome AS marketplace_nome,
        a.created_at,
        a.updated_at
      FROM anuncios a
      INNER JOIN produtos p
        ON p.id = a.produto_id
      LEFT JOIN marketplaces m
        ON m.id = a.marketplace_id
      ${whereClause}
      ORDER BY a.id ASC
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
      `,
      listParams
    )

    return res.json({
      anuncios: result.rows.map(montarRespostaAnuncio),
      total: Number(totalResult.rows[0]?.total || 0),
      page,
      limit
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao listar anuncios' })
  }
})

router.post('/', async (req, res) => {
  const usuarioId = req.user.id
  const produtoId = normalizarInteiro(req.body.produto_id)
  const marketplaceId = normalizarInteiro(req.body.marketplace_id)
  const skuAnuncio = normalizarTexto(req.body.sku_anuncio)
  const titulo = normalizarTexto(req.body.titulo) || null
  const preco = normalizarNumero(req.body.preco)
  const estoque = normalizarInteiro(req.body.estoque)
  const status = validarStatus(req.body.status)
  const temAds = normalizarBoolean(req.body.tem_ads, false)
  const full = normalizarBoolean(req.body.full, false)
  const emPromocao = normalizarBoolean(req.body.em_promocao, false)

  if (!produtoId) {
    return res.status(400).json({ erro: 'Produto e obrigatorio' })
  }

  if (!marketplaceId) {
    return res.status(400).json({ erro: 'Marketplace e obrigatorio' })
  }

  if (!skuAnuncio) {
    return res.status(400).json({ erro: 'SKU do anuncio e obrigatorio' })
  }

  if (!Number.isFinite(preco) || preco <= 0) {
    return res.status(400).json({ erro: 'Preco do anuncio deve ser maior que zero' })
  }

  if (estoque === null || estoque < 0) {
    return res.status(400).json({ erro: 'Estoque do anuncio deve ser zero ou maior' })
  }

  if (!status) {
    return res.status(400).json({ erro: 'Status do anuncio invalido' })
  }

  try {
    const produto = await carregarProdutoPorId(produtoId, usuarioId)
    if (!produto) {
      return res.status(400).json({ erro: 'Produto nao encontrado para este usuario' })
    }

    if (!(await carregarMarketplacePorId(marketplaceId))) {
      return res.status(400).json({ erro: 'Marketplace nao encontrado' })
    }

    const result = await pool.query(
      `
      INSERT INTO anuncios (
        usuario_id,
        produto_id,
        marketplace_id,
        sku_anuncio,
        titulo,
        preco,
        estoque,
        status,
        tem_ads,
        "full",
        em_promocao,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id
      `,
      [
        usuarioId,
        produtoId,
        marketplaceId,
        skuAnuncio,
        titulo,
        preco,
        estoque,
        status,
        temAds,
        full,
        emPromocao
      ]
    )

    const anuncio = await carregarAnuncioPorId(result.rows[0].id, usuarioId)
    return res.status(201).json({ anuncio: montarRespostaAnuncio(anuncio) })
  } catch (error) {
    console.error(error)

    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Ja existe um anuncio com este SKU e marketplace' })
    }

    return res.status(500).json({ erro: 'Erro ao criar anuncio' })
  }
})

router.put('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const anuncioId = Number.parseInt(req.params.id, 10)

  if (!Number.isInteger(anuncioId) || anuncioId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  const produtoId = normalizarInteiro(req.body.produto_id)
  const marketplaceId = normalizarInteiro(req.body.marketplace_id)
  const skuAnuncio = normalizarTexto(req.body.sku_anuncio)
  const titulo = normalizarTexto(req.body.titulo) || null
  const preco = normalizarNumero(req.body.preco)
  const estoque = normalizarInteiro(req.body.estoque)
  const status = validarStatus(req.body.status)
  const temAds = normalizarBoolean(req.body.tem_ads, false)
  const full = normalizarBoolean(req.body.full, false)
  const emPromocao = normalizarBoolean(req.body.em_promocao, false)

  if (!produtoId) {
    return res.status(400).json({ erro: 'Produto e obrigatorio' })
  }

  if (!marketplaceId) {
    return res.status(400).json({ erro: 'Marketplace e obrigatorio' })
  }

  if (!skuAnuncio) {
    return res.status(400).json({ erro: 'SKU do anuncio e obrigatorio' })
  }

  if (!Number.isFinite(preco) || preco <= 0) {
    return res.status(400).json({ erro: 'Preco do anuncio deve ser maior que zero' })
  }

  if (estoque === null || estoque < 0) {
    return res.status(400).json({ erro: 'Estoque do anuncio deve ser zero ou maior' })
  }

  if (!status) {
    return res.status(400).json({ erro: 'Status do anuncio invalido' })
  }

  try {
    const anuncioAtual = await carregarAnuncioPorId(anuncioId, usuarioId)
    if (!anuncioAtual) {
      return res.status(404).json({ erro: 'Anuncio nao encontrado' })
    }

    const produto = await carregarProdutoPorId(produtoId, usuarioId)
    if (!produto) {
      return res.status(400).json({ erro: 'Produto nao encontrado para este usuario' })
    }

    if (!(await carregarMarketplacePorId(marketplaceId))) {
      return res.status(400).json({ erro: 'Marketplace nao encontrado' })
    }

    await pool.query(
      `
      UPDATE anuncios
      SET produto_id = $1,
          marketplace_id = $2,
          sku_anuncio = $3,
          titulo = $4,
          preco = $5,
          estoque = $6,
          status = $7,
          tem_ads = $8,
          "full" = $9,
          em_promocao = $10,
          updated_at = NOW()
      WHERE id = $11
        AND usuario_id = $12
      `,
      [
        produtoId,
        marketplaceId,
        skuAnuncio,
        titulo,
        preco,
        estoque,
        status,
        temAds,
        full,
        emPromocao,
        anuncioId,
        usuarioId
      ]
    )

    const anuncio = await carregarAnuncioPorId(anuncioId, usuarioId)
    return res.json({ anuncio: montarRespostaAnuncio(anuncio) })
  } catch (error) {
    console.error(error)

    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Ja existe um anuncio com este SKU e marketplace' })
    }

    return res.status(500).json({ erro: 'Erro ao atualizar anuncio' })
  }
})

router.delete('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const anuncioId = Number.parseInt(req.params.id, 10)

  if (!Number.isInteger(anuncioId) || anuncioId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM anuncios
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [anuncioId, usuarioId]
    )

    if (!result.rows.length) {
      return res.status(404).json({ erro: 'Anuncio nao encontrado' })
    }

    return res.status(204).end()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao excluir anuncio' })
  }
})

module.exports = router
