const express = require('express')
const router = express.Router()

const calcularPreco = require('../services/calculoPreco')

router.post('/', (req, res) => {

  const { custo, taxaMarketplace, imposto, margem } = req.body

  const resultado = calcularPreco({
    custo,
    taxaMarketplace,
    imposto,
    margem
  })

  res.json(resultado)

})

module.exports = router