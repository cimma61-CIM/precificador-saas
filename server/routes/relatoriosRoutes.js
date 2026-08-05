const express = require('express')
const router = express.Router()
const pool = require('../db')

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarInteiro(valor) {
  const numero = Number.parseInt(valor, 10)
  return Number.isInteger(numero) && numero > 0 ? numero : null
}

function validarSituacao(valor) {
  const situacao = String(valor || '').trim().toLowerCase()
  const validos = new Set(['estoque_baixo', 'sem_estoque', 'margem_negativa', 'sem_preco'])
  return validos.has(situacao) ? situacao : null
}

function validarStatusAnuncio(valor) {
  const status = String(valor || '').trim().toLowerCase()
  const validos = new Set(['ativo', 'pausado', 'sem_estoque'])
  return validos.has(status) ? status : null
}

function calcularSituacoesProduto(produto) {
  const custo = Number(produto.custo || 0)
  const precoVenda = Number(produto.preco_venda || 0)
  const quantidade = Number(produto.quantidade || 0)
  const estoqueMin = Number(produto.estoque_min || 0)
  const situacoes = []

  if (precoVenda <= 0) {
    situacoes.push('sem_preco')
  }

  if (precoVenda > 0 && custo > precoVenda) {
    situacoes.push('margem_negativa')
  }

  if (quantidade <= 0) {
    situacoes.push('sem_estoque')
  } else if (quantidade <= estoqueMin) {
    situacoes.push('estoque_baixo')
  }

  return situacoes
}

function calcularMargemBruta(custo, precoVenda) {
  if (precoVenda <= 0) {
    return null
  }

  return Number((((precoVenda - custo) / precoVenda) * 100).toFixed(2))
}

router.get('/resumo', async (req, res) => {
  const usuarioId = req.user.id

  try {
    const resumoResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_produtos,
        COUNT(*) FILTER (WHERE COALESCE(p.quantidade, 0) <= COALESCE(p.estoque_min, 0))::int AS produtos_estoque_baixo,
        COALESCE(SUM(COALESCE(p.custo, 0) * COALESCE(p.quantidade, 0)), 0)::numeric(20,2) AS valor_estoque_estimado
      FROM produtos p
      WHERE p.usuario_id = $1
      `,
      [usuarioId]
    )

    const anunciosResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_anuncios,
        COUNT(*) FILTER (WHERE status = 'ativo')::int AS anuncios_ativos,
        COUNT(*) FILTER (WHERE status = 'pausado')::int AS anuncios_pausados,
        COUNT(*) FILTER (WHERE COALESCE(estoque, 0) <= 0)::int AS anuncios_sem_estoque
      FROM anuncios
      WHERE usuario_id = $1
      `,
      [usuarioId]
    )

    const resumo = resumoResult.rows[0] || {}
    const anuncios = anunciosResult.rows[0] || {}

    return res.json({
      total_produtos: Number(resumo.total_produtos || 0),
      produtos_estoque_baixo: Number(resumo.produtos_estoque_baixo || 0),
      valor_estoque_estimado: Number(resumo.valor_estoque_estimado || 0),
      total_anuncios: Number(anuncios.total_anuncios || 0),
      anuncios_ativos: Number(anuncios.anuncios_ativos || 0),
      anuncios_pausados: Number(anuncios.anuncios_pausados || 0),
      anuncios_sem_estoque: Number(anuncios.anuncios_sem_estoque || 0)
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao carregar resumo de relatorios' })
  }
})

router.get('/produtos', async (req, res) => {
  const usuarioId = req.user.id
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const requestedLimit = parseInt(req.query.limit, 10) || 10
  const limit = Math.min(Math.max(requestedLimit, 1), 200)
  const offset = (page - 1) * limit
  const busca = normalizarTexto(req.query.q || req.query.busca)
  const categoriaId = normalizarInteiro(req.query.categoria_id)
  const situacao = validarSituacao(req.query.situacao)

  try {
    const filtros = ['p.usuario_id = $1']
    const params = [usuarioId]

    if (busca) {
      params.push(`%${busca}%`)
      filtros.push(`(
        p.nome ILIKE $${params.length}
        OR COALESCE(p.sku, '') ILIKE $${params.length}
        OR COALESCE(p.ean, '') ILIKE $${params.length}
        OR COALESCE(p.barcode, '') ILIKE $${params.length}
        OR COALESCE(p.ncm, '') ILIKE $${params.length}
        OR COALESCE(c.nome, '') ILIKE $${params.length}
      )`)
    }

    if (categoriaId) {
      params.push(categoriaId)
      filtros.push(`p.categoria_id = $${params.length}`)
    }

    if (situacao) {
      if (situacao === 'sem_preco') {
        filtros.push(`COALESCE(p.preco_venda, p.preco, 0) <= 0`)
      } else if (situacao === 'margem_negativa') {
        filtros.push(`COALESCE(p.preco_venda, p.preco, 0) > 0 AND COALESCE(p.custo, 0) > COALESCE(p.preco_venda, p.preco, 0)`)
      } else if (situacao === 'sem_estoque') {
        filtros.push(`COALESCE(p.quantidade, 0) <= 0`)
      } else if (situacao === 'estoque_baixo') {
        filtros.push(`COALESCE(p.quantidade, 0) > 0 AND COALESCE(p.quantidade, 0) <= COALESCE(p.estoque_min, 0)`)
      }
    }

    const whereClause = `WHERE ${filtros.join(' AND ')}`

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM produtos p
      LEFT JOIN categorias c
        ON c.id = p.categoria_id
      ${whereClause}
      `,
      params
    )

    const produtosResult = await pool.query(
      `
      SELECT
        p.id,
        p.nome,
        p.sku,
        COALESCE(p.preco_venda, p.preco, 0)::numeric(10,2) AS preco_venda,
        p.custo,
        p.quantidade,
        p.estoque_min,
        p.estoque_max,
        c.id AS categoria_id,
        c.nome AS categoria_nome
      FROM produtos p
      LEFT JOIN categorias c
        ON c.id = p.categoria_id
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    )

    const total = countResult.rows[0]?.total || 0
    const totalPages = Math.max(Math.ceil(total / limit), 1)

    const produtos = produtosResult.rows.map((produto) => {
      const custo = Number(produto.custo || 0)
      const precoVenda = Number(produto.preco_venda || 0)
      const situacoes = calcularSituacoesProduto({
        custo,
        preco_venda: precoVenda,
        quantidade: Number(produto.quantidade || 0),
        estoque_min: Number(produto.estoque_min || 0)
      })

      return {
        id: produto.id,
        nome: produto.nome,
        sku: produto.sku,
        categoria_id: produto.categoria_id,
        categoria_nome: produto.categoria_nome || null,
        custo,
        preco_venda: precoVenda,
        quantidade: Number(produto.quantidade || 0),
        estoque_min: Number(produto.estoque_min || 0),
        estoque_max: Number(produto.estoque_max || 0),
        margem_bruta_estimada: calcularMargemBruta(custo, precoVenda),
        situacoes,
        situacao: situacoes[0] || null
      }
    })

    return res.json({
      produtos,
      total,
      page,
      limit,
      totalPages
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao buscar relatorio de produtos' })
  }
})

router.get('/anuncios', async (req, res) => {
  const usuarioId = req.user.id
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const requestedLimit = parseInt(req.query.limit, 10) || 10
  const limit = Math.min(Math.max(requestedLimit, 1), 200)
  const offset = (page - 1) * limit
  const busca = normalizarTexto(req.query.q || req.query.busca)
  const marketplaceId = normalizarInteiro(req.query.marketplace_id)
  const status = validarStatusAnuncio(req.query.status)

  try {
    const filtros = ['a.usuario_id = $1']
    const params = [usuarioId]

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
        OR COALESCE(p.nome, '') ILIKE $${params.length}
      )`)
    }

    const whereClause = `WHERE ${filtros.join(' AND ')}`

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM anuncios a
      LEFT JOIN produtos p
        ON p.id = a.produto_id
        AND p.usuario_id = a.usuario_id
      ${whereClause}
      `,
      params
    )

    const anunciosResult = await pool.query(
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
        m.nome AS marketplace_nome
      FROM anuncios a
      LEFT JOIN produtos p
        ON p.id = a.produto_id
        AND p.usuario_id = a.usuario_id
      LEFT JOIN marketplaces m
        ON m.id = a.marketplace_id
      ${whereClause}
      ORDER BY a.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    )

    const total = countResult.rows[0]?.total || 0
    const totalPages = Math.max(Math.ceil(total / limit), 1)

    const anuncios = anunciosResult.rows.map((anuncio) => ({
      id: anuncio.id,
      produto_id: anuncio.produto_id,
      marketplace_id: anuncio.marketplace_id,
      sku_anuncio: anuncio.sku_anuncio,
      titulo: anuncio.titulo,
      preco: Number(anuncio.preco || 0),
      estoque: Number(anuncio.estoque || 0),
      status: anuncio.status,
      tem_ads: Boolean(anuncio.tem_ads),
      full: Boolean(anuncio.full),
      em_promocao: Boolean(anuncio.em_promocao),
      produto_nome: anuncio.produto_nome || null,
      marketplace_nome: anuncio.marketplace_nome || null
    }))

    return res.json({
      anuncios,
      total,
      page,
      limit,
      totalPages
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao buscar relatorio de anuncios' })
  }
})

module.exports = router
