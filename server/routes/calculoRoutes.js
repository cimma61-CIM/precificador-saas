const express = require('express')
const router = express.Router()

const { calcularPreco } = require('../services/calculoPreco')

router.post('/calcular', (req, res) => {
  try {
    const { custo, frete, taxa, margem } = req.body

    const preco = calcularPreco({
      custo,
      frete,
      taxaPercentual: taxa,
      margem
    })

    res.json({ preco_sugerido: preco })
  } catch (err) {
    console.error('Erro no cálculo:', err.message)
    res.status(500).json({ erro: err.message || 'Erro no cálculo' })
  }
})

module.exports = router