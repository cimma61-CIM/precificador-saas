const express = require('express')
const router = express.Router()
const {
  buscarTaxaPorMarketplace,
  calcularPrecoComTaxas
} = require('../services/precoService')

router.post('/', async (req, res) => {
  const usuarioId = req.user.id
  const { custo, marketplace, margem, lucro_minimo } = req.body

  if (custo === undefined || !marketplace || margem === undefined) {
    return res.status(400).json({
      erro: 'Custo, marketplace e margem sao obrigatorios'
    })
  }

  try {
    const taxa = await buscarTaxaPorMarketplace(usuarioId, marketplace)

    if (!taxa) {
      return res.status(404).json({
        erro: 'Taxa do marketplace nao encontrada para este usuario'
      })
    }

    const resultado = calcularPrecoComTaxas({
      custo,
      margem,
      lucro_minimo,
      taxa
    })

    res.json(resultado)
  } catch (err) {
    console.error('Erro no calculo:', err)
    res.status(500).json({ erro: err.message || 'Erro no calculo' })
  }
})

module.exports = router
