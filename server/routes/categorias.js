const express = require('express')
const router = express.Router()
const pool = require('../db')
const { slugifyCategoria } = require('../utils/categorias')

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarTipoCanal(valor) {
  const tipo = normalizarTexto(valor).toLowerCase()

  if (!tipo) {
    return 'loja_virtual'
  }

  const tiposValidos = new Set(['loja_virtual', 'venda_direta', 'marketplace'])

  if (!tiposValidos.has(tipo)) {
    throw new Error('tipo_canal invalido')
  }

  return tipo
}

function normalizarBoolean(valor, fallback = true) {
  if (valor === undefined) {
    return fallback
  }

  if (typeof valor === 'boolean') {
    return valor
  }

  const texto = normalizarTexto(valor).toLowerCase()

  if (texto === 'true') {
    return true
  }

  if (texto === 'false') {
    return false
  }

  return fallback
}

async function carregarCategoriaPorId(id, usuarioId) {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.nome,
      c.slug,
      c.descricao,
      c.tipo_canal,
      c.marketplace_id,
      c.ativa,
      c.created_at,
      m.nome AS marketplace_nome,
      m.slug AS marketplace_slug
    FROM categorias c
    LEFT JOIN marketplaces m
      ON m.id = c.marketplace_id
    WHERE c.id = $1
      AND c.usuario_id = $2
    LIMIT 1
    `,
    [id, usuarioId]
  )

  return result.rows[0] || null
}

async function validarMarketplace(tipoCanal, marketplaceId) {
  if (tipoCanal !== 'marketplace') {
    return null
  }

  if (!Number.isInteger(marketplaceId) || marketplaceId <= 0) {
    throw new Error('marketplace_id obrigatorio para categorias de marketplace')
  }

  const result = await pool.query(
    `
    SELECT id, nome, slug
    FROM marketplaces
    WHERE id = $1
    LIMIT 1
    `,
    [marketplaceId]
  )

  if (!result.rows.length) {
    throw new Error('Marketplace nao encontrado')
  }

  return result.rows[0]
}

router.get('/', async (req, res) => {
  const usuarioId = req.user.id
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const requestedLimit = parseInt(req.query.limit, 10) || 100
  const limit = Math.min(Math.max(requestedLimit, 1), 200)
  const offset = (page - 1) * limit
  const busca = normalizarTexto(req.query.busca || req.query.q)
  const tipoCanal = normalizarTexto(req.query.tipo_canal).toLowerCase()
  const marketplaceId = Number.parseInt(req.query.marketplace_id, 10)
  const includeInactive = String(req.query.include_inactive || '').trim() === 'true'
  const retornoSimples =
    req.query.page === undefined &&
    req.query.limit === undefined &&
    req.query.busca === undefined &&
    req.query.q === undefined &&
    req.query.tipo_canal === undefined &&
    req.query.marketplace_id === undefined &&
    req.query.include_inactive === undefined

  try {
    const params = [usuarioId]
    const filtros = ['c.usuario_id = $1']

    if (!includeInactive) {
      filtros.push('c.ativa = true')
    }

    if (busca) {
      params.push(`%${busca}%`)
      filtros.push(`
        (
          c.nome ILIKE $${params.length}
          OR c.slug ILIKE $${params.length}
          OR COALESCE(c.descricao, '') ILIKE $${params.length}
          OR COALESCE(m.nome, '') ILIKE $${params.length}
        )
      `)
    }

    if (tipoCanal) {
      params.push(tipoCanal)
      filtros.push(`c.tipo_canal = $${params.length}`)
    }

    if (Number.isInteger(marketplaceId) && marketplaceId > 0) {
      params.push(marketplaceId)
      filtros.push(`c.marketplace_id = $${params.length}`)
    }

    const whereClause = filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''

    const totalResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM categorias c
      LEFT JOIN marketplaces m
        ON m.id = c.marketplace_id
      ${whereClause}
      `,
      params
    )

    const listParams = [...params, limit, offset]
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.nome,
        c.slug,
        c.descricao,
        c.tipo_canal,
        c.marketplace_id,
        c.ativa,
        c.created_at,
        m.nome AS marketplace_nome,
        m.slug AS marketplace_slug
      FROM categorias c
      LEFT JOIN marketplaces m
        ON m.id = c.marketplace_id
      ${whereClause}
      ORDER BY c.ativa DESC, c.tipo_canal ASC, c.nome ASC, c.id ASC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
      `,
      listParams
    )

    if (retornoSimples) {
      return res.json(result.rows)
    }

    return res.json({
      categorias: result.rows,
      total: Number(totalResult.rows[0]?.total || 0),
      page,
      limit
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao listar categorias' })
  }
})

router.post('/', async (req, res) => {
  const usuarioId = req.user.id
  const nome = normalizarTexto(req.body.nome)
  const descricao = normalizarTexto(req.body.descricao)

  if (!nome) {
    return res.status(400).json({ erro: 'Nome da categoria e obrigatorio' })
  }

  try {
    const tipoCanal = normalizarTipoCanal(req.body.tipo_canal)
    const marketplaceId = tipoCanal === 'marketplace'
      ? Number.parseInt(req.body.marketplace_id, 10)
      : null
    const slug = slugifyCategoria(req.body.slug || nome)
    const ativa = normalizarBoolean(req.body.ativa, true)

    if (!slug) {
      return res.status(400).json({ erro: 'Slug invalido' })
    }

    await validarMarketplace(tipoCanal, marketplaceId)

    const result = await pool.query(
      `
      INSERT INTO categorias (nome, slug, descricao, tipo_canal, marketplace_id, usuario_id, ativa)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [nome, slug, descricao || null, tipoCanal, marketplaceId, usuarioId, ativa]
    )

    return res.status(201).json({
      categoria: await carregarCategoriaPorId(result.rows[0].id, usuarioId)
    })
  } catch (error) {
    console.error(error)

    if (error.message) {
      const mensagens = new Set([
        'tipo_canal invalido',
        'marketplace_id obrigatorio para categorias de marketplace',
        'Marketplace nao encontrado'
      ])

      if (mensagens.has(error.message)) {
        return res.status(400).json({ erro: error.message })
      }
    }

    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Ja existe uma categoria com esse slug neste canal' })
    }

    return res.status(500).json({ erro: 'Erro ao criar categoria' })
  }
})

router.put('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const categoriaId = Number.parseInt(req.params.id, 10)

  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  const nome = normalizarTexto(req.body.nome)
  const descricao = normalizarTexto(req.body.descricao)

  if (!nome) {
    return res.status(400).json({ erro: 'Nome da categoria e obrigatorio' })
  }

  try {
    const categoriaAtual = await carregarCategoriaPorId(categoriaId, usuarioId)

    if (!categoriaAtual) {
      return res.status(404).json({ erro: 'Categoria nao encontrada' })
    }

    const tipoCanal = normalizarTipoCanal(req.body.tipo_canal || categoriaAtual.tipo_canal)
    const marketplaceId = tipoCanal === 'marketplace'
      ? Number.parseInt(req.body.marketplace_id ?? categoriaAtual.marketplace_id, 10)
      : null
    const slug = slugifyCategoria(req.body.slug || nome || categoriaAtual.nome)
    const ativa = normalizarBoolean(req.body.ativa, categoriaAtual.ativa)

    await validarMarketplace(tipoCanal, marketplaceId)

    await pool.query(
      `
      UPDATE categorias
      SET
        nome = $1,
        slug = $2,
        descricao = $3,
        tipo_canal = $4,
        marketplace_id = $5,
        ativa = $6
      WHERE id = $7
        AND usuario_id = $8
      `,
      [nome, slug, descricao || null, tipoCanal, marketplaceId, ativa, categoriaId, usuarioId]
    )

    return res.json({
      categoria: await carregarCategoriaPorId(categoriaId, usuarioId)
    })
  } catch (error) {
    console.error(error)

    if (error.message) {
      const mensagens = new Set([
        'tipo_canal invalido',
        'marketplace_id obrigatorio para categorias de marketplace',
        'Marketplace nao encontrado'
      ])

      if (mensagens.has(error.message)) {
        return res.status(400).json({ erro: error.message })
      }
    }

    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Ja existe uma categoria com esse slug neste canal' })
    }

    return res.status(500).json({ erro: 'Erro ao atualizar categoria' })
  }
})

router.delete('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const categoriaId = Number.parseInt(req.params.id, 10)
  const hardDelete = String(req.query.hard || 'true').trim() !== 'false'

  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const categoriaAtual = await carregarCategoriaPorId(categoriaId, usuarioId)

    if (!categoriaAtual) {
      return res.status(404).json({ erro: 'Categoria nao encontrada' })
    }

    if (hardDelete) {
      const usoResult = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM produtos
        WHERE categoria_id = $1
          AND usuario_id = $2
        `,
        [categoriaId, usuarioId]
      )

      if (Number(usoResult.rows[0]?.total || 0) > 0) {
        return res.status(409).json({ erro: 'Categoria em uso por produtos. Desative em vez de excluir.' })
      }

      await pool.query('DELETE FROM categorias WHERE id = $1 AND usuario_id = $2', [categoriaId, usuarioId])
      return res.json({ removida: true })
    }

    await pool.query(
      `
      UPDATE categorias
      SET ativa = false
      WHERE id = $1
        AND usuario_id = $2
      `,
      [categoriaId, usuarioId]
    )

    return res.json({
      categoria: await carregarCategoriaPorId(categoriaId, usuarioId)
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao remover categoria' })
  }
})

module.exports = router
