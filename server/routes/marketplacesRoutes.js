const express = require('express')
const router = express.Router()
const pool = require('../db')
const { normalizarMarketplace } = require('../services/precoService')

function normalizarNomeMarketplace(valor) {
  return String(valor || '').trim()
}

function normalizarSlugMarketplace(valor, nomeFallback = '') {
  const base = String(valor || '').trim() || nomeFallback
  return normalizarMarketplace(base)
}

async function buscarRelacionamentosMarketplace(marketplaceId) {
  const result = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM produtos_marketplaces WHERE marketplace_id = $1) AS produtos_marketplaces_count,
      (SELECT COUNT(*)::int FROM taxas_marketplace WHERE marketplace_id = $1) AS taxas_marketplace_count,
      (
        SELECT COUNT(*)::int
        FROM precificacao
        WHERE marketplace_id = $1
      ) AS precificacao_count
    `,
    [marketplaceId]
  )

  const relacoes = result.rows[0] || {
    produtos_marketplaces_count: 0,
    taxas_marketplace_count: 0,
    precificacao_count: 0
  }

  const totalRelacionamentos =
    Number(relacoes.produtos_marketplaces_count || 0) +
    Number(relacoes.taxas_marketplace_count || 0) +
    Number(relacoes.precificacao_count || 0)

  return {
    produtos_marketplaces_count: Number(relacoes.produtos_marketplaces_count || 0),
    taxas_marketplace_count: Number(relacoes.taxas_marketplace_count || 0),
    precificacao_count: Number(relacoes.precificacao_count || 0),
    total_relacionamentos: totalRelacionamentos,
    pode_excluir: totalRelacionamentos === 0
  }
}

async function validarDuplicidadeMarketplace({ nome, slug, marketplaceId = null }) {
  const params = [nome, slug]
  const filtroId = marketplaceId ? 'AND id <> $3' : ''

  if (marketplaceId) {
    params.push(marketplaceId)
  }

  const result = await pool.query(
    `
    SELECT id, nome, slug
    FROM marketplaces
    WHERE (
      LOWER(nome) = LOWER($1)
      OR slug = $2
    )
    ${filtroId}
    ORDER BY id ASC
    LIMIT 1
    `,
    params
  )

  if (!result.rows.length) {
    return null
  }

  const existente = result.rows[0]

  if (existente.slug === slug) {
    throw new Error('Ja existe um marketplace com este slug')
  }

  if (String(existente.nome || '').trim().toLowerCase() === nome.toLowerCase()) {
    throw new Error('Ja existe um marketplace com este nome')
  }

  throw new Error('Marketplace ja cadastrado')
}

async function montarMarketplaceResposta(row) {
  const relacionamentos = await buscarRelacionamentosMarketplace(row.id)

  return {
    ...row,
    ...relacionamentos
  }
}

router.get('/', async (req, res) => {
  try {
    const incluirInativos = String(req.query.include_inactive || '').trim() === 'true'
    const busca = String(req.query.q || '').trim()
    const params = [incluirInativos]
    let filtroBusca = ''

    if (busca) {
      params.push(`%${busca}%`)
      filtroBusca = `
        AND (
          nome ILIKE $2
          OR slug ILIKE $2
        )
      `
    }

    const result = await pool.query(
      `
      SELECT id, nome, slug, ativo, criado_em
      FROM marketplaces
      WHERE ($1::boolean = true OR ativo = true)
      ${filtroBusca}
      ORDER BY ativo DESC, nome ASC, id ASC
      `,
      params
    )

    const marketplaces = await Promise.all(
      result.rows.map((row) => montarMarketplaceResposta(row))
    )

    res.json({ marketplaces })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar marketplaces' })
  }
})

router.post('/', async (req, res) => {
  const nome = normalizarNomeMarketplace(req.body.nome)

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do marketplace e obrigatorio' })
  }

  try {
    const slug = normalizarSlugMarketplace(req.body.slug, nome)

    await validarDuplicidadeMarketplace({ nome, slug })

    const result = await pool.query(
      `
      INSERT INTO marketplaces (nome, slug, ativo)
      VALUES ($1, $2, true)
      RETURNING id, nome, slug, ativo, criado_em
      `,
      [nome, slug]
    )

    res.status(201).json(await montarMarketplaceResposta(result.rows[0]))
  } catch (err) {
    console.error(err)

    if (err.message && err.message.includes('marketplace')) {
      return res.status(409).json({ erro: err.message })
    }

    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Marketplace ja cadastrado' })
    }

    res.status(500).json({ erro: 'Erro ao salvar marketplace' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const nome = normalizarNomeMarketplace(req.body.nome)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do marketplace e obrigatorio' })
  }

  try {
    const slug = normalizarSlugMarketplace(req.body.slug, nome)

    await validarDuplicidadeMarketplace({ nome, slug, marketplaceId: id })

    const result = await pool.query(
      `
      UPDATE marketplaces
      SET nome = $1, slug = $2
      WHERE id = $3
      RETURNING id, nome, slug, ativo, criado_em
      `,
      [nome, slug, id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ erro: 'Marketplace nao encontrado' })
    }

    res.json(await montarMarketplaceResposta(result.rows[0]))
  } catch (err) {
    console.error(err)

    if (err.message && err.message.includes('marketplace')) {
      return res.status(409).json({ erro: err.message })
    }

    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Marketplace ja cadastrado' })
    }

    res.status(500).json({ erro: 'Erro ao atualizar marketplace' })
  }
})

router.patch('/:id/deactivate', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const result = await pool.query(
      `
      UPDATE marketplaces
      SET ativo = false
      WHERE id = $1
      RETURNING id, nome, slug, ativo, criado_em
      `,
      [id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ erro: 'Marketplace nao encontrado' })
    }

    res.json(await montarMarketplaceResposta(result.rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao desativar marketplace' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const marketplaceResult = await pool.query(
      `
      SELECT id, nome, slug, ativo, criado_em
      FROM marketplaces
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    )

    if (!marketplaceResult.rows.length) {
      return res.status(404).json({ erro: 'Marketplace nao encontrado' })
    }

    const relacionamentos = await buscarRelacionamentosMarketplace(id)

    if (!relacionamentos.pode_excluir) {
      return res.status(409).json({
        erro: 'Nao e possivel excluir marketplace com relacionamentos ativos',
        relacionamentos
      })
    }

    await pool.query(
      `
      DELETE FROM marketplaces
      WHERE id = $1
      `,
      [id]
    )

    res.json({
      mensagem: 'Marketplace excluido com sucesso',
      marketplace: marketplaceResult.rows[0]
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao excluir marketplace' })
  }
})

module.exports = router
