const express = require('express')
const router = express.Router()
const pool = require('../db')
const {
  normalizarPercentual,
  normalizarValorMonetario
} = require('../services/precoService')

router.get('/', async (req, res) => {
  const usuarioId = req.user.id

  try {
    const result = await pool.query(
      `
      SELECT
        tm.id,
        tm.marketplace_id,
        m.nome AS marketplace_nome,
        m.slug AS marketplace_slug,
        tm.taxa_percentual,
        tm.taxa_fixa,
        tm.frete_medio,
        tm.imposto_percentual,
        tm.criado_em
      FROM taxas_marketplace tm
      INNER JOIN marketplaces m
        ON m.id = tm.marketplace_id
      WHERE tm.usuario_id = $1
      ORDER BY m.nome ASC, tm.id DESC
      `,
      [usuarioId]
    )

    res.json({ taxas: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar taxas' })
  }
})

router.post('/', async (req, res) => {
  const usuarioId = req.user.id
  const {
    marketplace_id,
    taxa_percentual = 0,
    taxa_fixa = 0,
    frete_medio = 0,
    imposto_percentual = 0
  } = req.body

  const marketplaceId = Number(marketplace_id)

  if (!Number.isInteger(marketplaceId) || marketplaceId <= 0) {
    return res.status(400).json({ erro: 'Marketplace e obrigatorio' })
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO taxas_marketplace (
        usuario_id,
        marketplace_id,
        taxa_percentual,
        taxa_fixa,
        frete_medio,
        imposto_percentual
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        marketplace_id,
        taxa_percentual,
        taxa_fixa,
        frete_medio,
        imposto_percentual,
        criado_em
      `,
      [
        usuarioId,
        marketplaceId,
        normalizarPercentual(taxa_percentual),
        normalizarValorMonetario(taxa_fixa, 'Taxa fixa'),
        normalizarValorMonetario(frete_medio, 'Frete medio'),
        normalizarPercentual(imposto_percentual)
      ]
    )

    const taxaCompleta = await pool.query(
      `
      SELECT
        tm.id,
        tm.marketplace_id,
        m.nome AS marketplace_nome,
        m.slug AS marketplace_slug,
        tm.taxa_percentual,
        tm.taxa_fixa,
        tm.frete_medio,
        tm.imposto_percentual,
        tm.criado_em
      FROM taxas_marketplace tm
      INNER JOIN marketplaces m
        ON m.id = tm.marketplace_id
      WHERE tm.id = $1
      AND tm.usuario_id = $2
      `,
      [result.rows[0].id, usuarioId]
    )

    res.status(201).json(taxaCompleta.rows[0])
  } catch (err) {
    console.error(err)

    if (err.code === '23503') {
      return res.status(400).json({ erro: 'Marketplace invalido' })
    }

    if (err.code === '23505') {
      return res.status(400).json({
        erro: 'Ja existe uma taxa para este marketplace'
      })
    }

    res.status(500).json({ erro: err.message || 'Erro ao salvar taxa' })
  }
})

router.put('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const id = Number(req.params.id)
  const {
    marketplace_id,
    taxa_percentual = 0,
    taxa_fixa = 0,
    frete_medio = 0,
    imposto_percentual = 0
  } = req.body

  const marketplaceId = Number(marketplace_id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  if (!Number.isInteger(marketplaceId) || marketplaceId <= 0) {
    return res.status(400).json({ erro: 'Marketplace e obrigatorio' })
  }

  try {
    const result = await pool.query(
      `
      UPDATE taxas_marketplace
      SET
        marketplace_id = $1,
        taxa_percentual = $2,
        taxa_fixa = $3,
        frete_medio = $4,
        imposto_percentual = $5
      WHERE id = $6
      AND usuario_id = $7
      RETURNING id
      `,
      [
        marketplaceId,
        normalizarPercentual(taxa_percentual),
        normalizarValorMonetario(taxa_fixa, 'Taxa fixa'),
        normalizarValorMonetario(frete_medio, 'Frete medio'),
        normalizarPercentual(imposto_percentual),
        id,
        usuarioId
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Taxa nao encontrada' })
    }

    const taxaCompleta = await pool.query(
      `
      SELECT
        tm.id,
        tm.marketplace_id,
        m.nome AS marketplace_nome,
        m.slug AS marketplace_slug,
        tm.taxa_percentual,
        tm.taxa_fixa,
        tm.frete_medio,
        tm.imposto_percentual,
        tm.criado_em
      FROM taxas_marketplace tm
      INNER JOIN marketplaces m
        ON m.id = tm.marketplace_id
      WHERE tm.id = $1
      AND tm.usuario_id = $2
      `,
      [id, usuarioId]
    )

    res.json(taxaCompleta.rows[0])
  } catch (err) {
    console.error(err)

    if (err.code === '23503') {
      return res.status(400).json({ erro: 'Marketplace invalido' })
    }

    if (err.code === '23505') {
      return res.status(400).json({
        erro: 'Ja existe uma taxa para este marketplace'
      })
    }

    res.status(500).json({ erro: err.message || 'Erro ao atualizar taxa' })
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
      `
      DELETE FROM taxas_marketplace
      WHERE id = $1
      AND usuario_id = $2
      RETURNING id
      `,
      [id, usuarioId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Taxa nao encontrada' })
    }

    res.json({ mensagem: 'Taxa removida com sucesso' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao excluir taxa' })
  }
})

module.exports = router
