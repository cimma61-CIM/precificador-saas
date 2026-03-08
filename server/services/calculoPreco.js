function calcularPreco({ custo, frete = 0, taxaPercentual = 0, margem = 0 }) {
  const custoNum = parseFloat(custo) || 0
  const freteNum = parseFloat(frete) || 0
  const taxa = (parseFloat(taxaPercentual) || 0) / 100
  const margemDecimal = (parseFloat(margem) || 0) / 100

  const divisor = 1 - taxa - margemDecimal

  if (divisor <= 0) {
    throw new Error('Taxa + margem não podem ser maior ou igual a 100%')
  }

  const preco = (custoNum + freteNum) / divisor

  return Number(preco.toFixed(2))
}

module.exports = { calcularPreco }