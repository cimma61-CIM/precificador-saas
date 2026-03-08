const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/lucro', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        id,
        nome,
        preco_venda,
        preco_custo,
        marketplace
      FROM produtos
    `)

    const produtos = result.rows.map(p => {

      const taxa = p.marketplace === 'mercado_livre' ? 0.16 : 0.20
      const frete = 8

      const taxaValor = p.preco_venda * taxa

      const lucro =
        p.preco_venda -
        taxaValor -
        frete -
        p.preco_custo

      return {
        ...p,
        lucro_liquido: Number(lucro.toFixed(2)),
        prejuizo: lucro < 0
      }

    })

    res.json(produtos)

  } catch (err) {

    console.error(err)
    res.status(500).json({ erro: 'Erro na análise' })

  }

})

module.exports = router