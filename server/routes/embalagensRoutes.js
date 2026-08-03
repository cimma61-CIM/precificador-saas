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

function normalizarBoolean(valor, fallback = true) {
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

function validarNumeroPositivo(valor) {
  return Number.isFinite(valor) && valor > 0
}

async function carregarEmbalagemPorId(id, usuarioId) {
  const result = await pool.query(
    `
    SELECT
      id,
      usuario_id,
      nome,
      peso_kg,
      largura_cm,
      altura_cm,
      comprimento_cm,
      ativo,
      created_at,
      updated_at
    FROM embalagens
    WHERE id = $1
      AND usuario_id = $2
    LIMIT 1
    `,
    [id, usuarioId]
  )

  return result.rows[0] || null
}

function montarRespostaEmbalagem(row) {
  const peso = Number(row.peso_kg)
  const largura = Number(row.largura_cm)
  const altura = Number(row.altura_cm)
  const comprimento = Number(row.comprimento_cm)

  return {
    ...row,
    peso_kg: peso,
    largura_cm: largura,
    altura_cm: altura,
    comprimento_cm: comprimento,
    volume_cm3: Number((largura * altura * comprimento).toFixed(2))
  }
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
    const filtros = ['e.usuario_id = $1']

    if (!includeInactive) {
      filtros.push('e.ativo = true')
    }

    if (busca) {
      params.push(`%${busca}%`)
      filtros.push(`
        (
          e.nome ILIKE $${params.length}
        )
      `)
    }

    const whereClause = filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''

    const totalResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM embalagens e
      ${whereClause}
      `,
      params
    )

    const listParams = [...params, limit, offset]
    const result = await pool.query(
      `
      SELECT
        e.id,
        e.nome,
        e.peso_kg,
        e.largura_cm,
        e.altura_cm,
        e.comprimento_cm,
        e.ativo,
        e.created_at,
        e.updated_at
      FROM embalagens e
      ${whereClause}
      ORDER BY e.ativo DESC, e.nome ASC, e.id ASC
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
      `,
      listParams
    )

    return res.json({
      embalagens: result.rows.map(montarRespostaEmbalagem),
      total: Number(totalResult.rows[0]?.total || 0),
      page,
      limit
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao listar embalagens' })
  }
})

router.post('/', async (req, res) => {
  const usuarioId = req.user.id
  const nome = normalizarTexto(req.body.nome)
  const pesoKg = normalizarNumero(req.body.peso_kg)
  const larguraCm = normalizarNumero(req.body.largura_cm)
  const alturaCm = normalizarNumero(req.body.altura_cm)
  const comprimentoCm = normalizarNumero(req.body.comprimento_cm)
  const ativo = normalizarBoolean(req.body.ativo, true)

  if (!nome) {
    return res.status(400).json({ erro: 'Nome da embalagem e obrigatorio' })
  }

  if (!validarNumeroPositivo(pesoKg)) {
    return res.status(400).json({ erro: 'Peso em kg deve ser um numero maior que zero' })
  }

  if (!validarNumeroPositivo(larguraCm)) {
    return res.status(400).json({ erro: 'Largura em cm deve ser um numero maior que zero' })
  }

  if (!validarNumeroPositivo(alturaCm)) {
    return res.status(400).json({ erro: 'Altura em cm deve ser um numero maior que zero' })
  }

  if (!validarNumeroPositivo(comprimentoCm)) {
    return res.status(400).json({ erro: 'Comprimento em cm deve ser um numero maior que zero' })
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO embalagens (usuario_id, nome, peso_kg, largura_cm, altura_cm, comprimento_cm, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
      `,
      [usuarioId, nome, pesoKg, larguraCm, alturaCm, comprimentoCm, ativo]
    )

    const embalagem = await carregarEmbalagemPorId(result.rows[0].id, usuarioId)
    return res.status(201).json({ embalagem: montarRespostaEmbalagem(embalagem) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao criar embalagem' })
  }
})

router.put('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const embalagemId = Number.parseInt(req.params.id, 10)

  if (!Number.isInteger(embalagemId) || embalagemId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  const nome = normalizarTexto(req.body.nome)
  const pesoKg = normalizarNumero(req.body.peso_kg)
  const larguraCm = normalizarNumero(req.body.largura_cm)
  const alturaCm = normalizarNumero(req.body.altura_cm)
  const comprimentoCm = normalizarNumero(req.body.comprimento_cm)

  if (!nome) {
    return res.status(400).json({ erro: 'Nome da embalagem e obrigatorio' })
  }

  if (!validarNumeroPositivo(pesoKg)) {
    return res.status(400).json({ erro: 'Peso em kg deve ser um numero maior que zero' })
  }

  if (!validarNumeroPositivo(larguraCm)) {
    return res.status(400).json({ erro: 'Largura em cm deve ser um numero maior que zero' })
  }

  if (!validarNumeroPositivo(alturaCm)) {
    return res.status(400).json({ erro: 'Altura em cm deve ser um numero maior que zero' })
  }

  if (!validarNumeroPositivo(comprimentoCm)) {
    return res.status(400).json({ erro: 'Comprimento em cm deve ser um numero maior que zero' })
  }

  try {
    const embalagemAtual = await carregarEmbalagemPorId(embalagemId, usuarioId)
    if (!embalagemAtual) {
      return res.status(404).json({ erro: 'Embalagem nao encontrada' })
    }

    const ativo = normalizarBoolean(req.body.ativo, embalagemAtual.ativo)

    await pool.query(
      `
      UPDATE embalagens
      SET nome = $1,
          peso_kg = $2,
          largura_cm = $3,
          altura_cm = $4,
          comprimento_cm = $5,
          ativo = $6,
          updated_at = NOW()
      WHERE id = $7
        AND usuario_id = $8
      `,
      [nome, pesoKg, larguraCm, alturaCm, comprimentoCm, ativo, embalagemId, usuarioId]
    )

    const embalagem = await carregarEmbalagemPorId(embalagemId, usuarioId)
    return res.json({ embalagem: montarRespostaEmbalagem(embalagem) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao atualizar embalagem' })
  }
})

router.delete('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const embalagemId = Number.parseInt(req.params.id, 10)

  if (!Number.isInteger(embalagemId) || embalagemId <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM embalagens
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [embalagemId, usuarioId]
    )

    if (!result.rows.length) {
      return res.status(404).json({ erro: 'Embalagem nao encontrada' })
    }

    return res.status(204).end()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao excluir embalagem' })
  }
})

module.exports = router
