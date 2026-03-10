const express = require('express')
const router = express.Router()
const pool = require('../db')
const { normalizarMarketplace } = require('../services/precoService')

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, nome, slug, criado_em
      FROM marketplaces
      ORDER BY nome ASC, id ASC
      `
    )

    res.json({ marketplaces: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar marketplaces' })
  }
})

router.post('/', async (req, res) => {
  const nome = String(req.body.nome || '').trim()

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do marketplace e obrigatorio' })
  }

  try {
    const slug = normalizarMarketplace(nome)

    const result = await pool.query(
      `
      INSERT INTO marketplaces (nome, slug)
      VALUES ($1, $2)
      RETURNING id, nome, slug, criado_em
      `,
      [nome, slug]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)

    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Marketplace ja cadastrado' })
    }

    res.status(500).json({ erro: 'Erro ao salvar marketplace' })
  }
})

module.exports = router
