function calcularPreco({ custo, frete = 0, taxaPercentual = 0, margem = 0 }) {

  const custoNum = parseFloat(custo) || 0
  const freteNum = parseFloat(frete) || 0
  const taxa = (parseFloat(taxaPercentual) || 0) / 100
  const margemDecimal = (parseFloat(margem) || 0) / 100

  const preco =
    (custoNum + freteNum) /
    (1 - taxa - margemDecimal)

  return Number(preco.toFixed(2))
}

module.exports = { calcularPreco }