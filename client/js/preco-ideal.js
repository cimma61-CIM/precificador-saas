export function calcularPrecoIdealBase({
  custo = 0,
  taxaFixa = 0,
  freteMedio = 0,
  taxaPercentual = 0,
  impostoPercentual = 0,
  indiceExtraPercentual = 0
} = {}) {
  const custoNormalizado = Number(custo || 0)
  const taxaFixaNormalizada = Number(taxaFixa || 0)
  const freteMedioNormalizado = Number(freteMedio || 0)
  const taxaPercentualNormalizada = Number(taxaPercentual || 0)
  const impostoPercentualNormalizado = Number(impostoPercentual || 0)
  const indiceExtraPercentualNormalizado = Number(indiceExtraPercentual || 0)
  const taxaTotal = taxaPercentualNormalizada + impostoPercentualNormalizado + indiceExtraPercentualNormalizado
  const divisor = 1 - taxaTotal

  if (custoNormalizado <= 0 || divisor <= 0) {
    return null
  }

  const precoIdeal = (custoNormalizado + taxaFixaNormalizada + freteMedioNormalizado) / divisor

  if (!Number.isFinite(precoIdeal) || precoIdeal <= 0) {
    return null
  }

  return precoIdeal
}

if (typeof window !== 'undefined') {
  window.precoIdealUtils = window.precoIdealUtils || {
    calcularPrecoIdealBase
  }
}
