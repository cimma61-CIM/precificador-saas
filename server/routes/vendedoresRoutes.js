const express = require('express')
const router = express.Router()
const pool = require('../db')

function normalizarTexto(valor) {
  return String(valor || '').trim()
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

function validarEmail(email) {
  if (!email) {
    return true
  }

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

async function carregarVendedorPorId(id, usuarioId) {
  const result = await pool.query(
    `
    SELECT
      id,
      usuario_id,
      nome,
      email,
      telefone,
      ativo,
      created_at,
      updated_at
    FROM vendedores
    WHERE id = $1
      AND usuario_id = $2
    LIMIT 1
    `,
    [id, usuarioId]
  )

  return result.rows[0] || null
}

router.get('/', async (req, res) => {
  const usuarioId = req.user.id
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const requestedLimit = parseInt(req.query.limit, 10) || 100
  const limit = Math.min(Math.max(requestedLimit, 1), 200)
  const offset = (page - 1) * limit
  const busca = normalizarTexto(req.query.q || req.query.busca)
  const includeInactive = String(req.query.include_inactive || '').trim() === 'true'

  try {
    const params = [usuarioId]
    const filtros = ['v.usuario_id = $1']

    if (!includeInactive) {
      filtros.push('v.ativo = true')
    }

    if (busca) {
      params.push(`%${busca}%`)
      filtros.push(`
        (
          v.nome ILIKE $${params.length}
          OR COALESCE(v.email, '') ILIKE $${params.length}
          OR COALESCE(v.telefone, '') ILIKE $${params.length}
        )
      `)
    }

    const whereClause = filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''

    const totalResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM vendedores v
      ${whereClause}
      `,
      params
    )

    const listParams = [...params, limit, offset]
    const result = await pool.query(
      `
      SELECT
        v.id,
        v.nome,
        v.email,
        v.telefone,
        v.ativo,
        v.created_at,
        v.updated_at
      FROM vendedores v
      ${whereClause}
      ORDER BY v.ativo DESC, v.nome ASC, v.id ASC
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
      `,
      listParams
    )

    return res.json({
      vendedores: result.rows,
      total: Number(totalResult.rows[0]?.total || 0),
      page,
      limit
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao listar vendedores' })
  }
})

router.post('/', async (req, res) => {
  const usuarioId = req.user.id
  const nome = normalizarTexto(req.body.nome)
  const email = normalizarTexto(req.body.email)
  const telefone = normalizarTexto(req.body.telefone)
  const ativo = normalizarBoolean(req.body.ativo, true)

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do vendedor e obrigatorio' })
  }

  if (email && !validarEmail(email)) {
    return res.status(400).json({ erro: 'Email invalido' })
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO vendedores (usuario_id, nome, email, telefone, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
      `,
      [usuarioId, nome, email || null, telefone || null, ativo]
    )

    const vendedor = await carregarVendedorPorId(result.rows[0].id, usuarioId)

    return res.status(201).json({ vendedor })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao criar vendedor' })
  }
})

router.put('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const vendedorId = Number.parseInt(req.params.id, 10)

  if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  const nome = normalizarTexto(req.body.nome)
  const email = normalizarTexto(req.body.email)
  const telefone = normalizarTexto(req.body.telefone)
  const ativo = normalizarBoolean(req.body.ativo, true)

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do vendedor e obrigatorio' })
  }

  if (email && !validarEmail(email)) {
    return res.status(400).json({ erro: 'Email invalido' })
  }

  try {
    const vendedorAtual = await carregarVendedorPorId(vendedorId, usuarioId)

    if (!vendedorAtual) {
      return res.status(404).json({ erro: 'Vendedor nao encontrado' })
    }

    await pool.query(
      `
      UPDATE vendedores
      SET nome = $1,
          email = $2,
          telefone = $3,
          ativo = $4,
          updated_at = NOW()
      WHERE id = $5
        AND usuario_id = $6
      `,
      [nome, email || null, telefone || null, ativo, vendedorId, usuarioId]
    )

    const vendedor = await carregarVendedorPorId(vendedorId, usuarioId)
    return res.json({ vendedor })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao atualizar vendedor' })
  }
})

router.delete('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const vendedorId = Number.parseInt(req.params.id, 10)

  if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM vendedores
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [vendedorId, usuarioId]
    )

    if (!result.rows.length) {
      return res.status(404).json({ erro: 'Vendedor nao encontrado' })
    }

    return res.status(204).end()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao excluir vendedor' })
  }
})

module.exports = router
