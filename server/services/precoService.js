const pool = require('../db')

function normalizarPercentual(valor) {
  const numero = Number(valor || 0)

  if (Number.isNaN(numero) || numero < 0) {
    throw new Error('Percentuais devem ser numeros validos')
  }

  return numero > 1 ? numero / 100 : numero
}

function normalizarValorMonetario(valor, campo) {
  const numero = Number(valor || 0)

  if (Number.isNaN(numero) || numero < 0) {
    throw new Error(`${campo} deve ser um numero valido`)
  }

  return numero
}

function normalizarMarketplace(valor) {
  if (!valor || !String(valor).trim()) {
    throw new Error('Marketplace eh obrigatorio')
  }

  const slug = String(valor)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  if (!slug) {
    throw new Error('Marketplace eh obrigatorio')
  }

  return slug
}

async function buscarTaxaPorMarketplace(usuarioId, marketplace) {
  const marketplaceNormalizado = normalizarMarketplace(marketplace)

  const result = await pool.query(
    `
    SELECT
      tm.id,
      tm.usuario_id,
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
    AND m.slug = $2
    LIMIT 1
    `,
    [usuarioId, marketplaceNormalizado]
  )

  return result.rows[0] || null
}

function calcularPrecoComTaxas({ custo, margem, taxa, lucro_minimo = 0, lucroMinimo = 0 }) {
  const custoBase = normalizarValorMonetario(custo, 'Custo')
  const margemDesejada = normalizarPercentual(margem)
  const lucroMinimoCalculado = normalizarValorMonetario(
    lucro_minimo || lucroMinimo,
    'Lucro minimo'
  )
  const taxaPercentual = normalizarPercentual(taxa.taxa_percentual)
  const impostoPercentual = normalizarPercentual(taxa.imposto_percentual)
  const taxaFixa = normalizarValorMonetario(taxa.taxa_fixa, 'Taxa fixa')
  const freteMedio = normalizarValorMonetario(taxa.frete_medio, 'Frete medio')

  const divisorMargem =
    1 - taxaPercentual - impostoPercentual - margemDesejada

  const divisorLucro =
    1 - taxaPercentual - impostoPercentual

  if (divisorMargem <= 0) {
    throw new Error('Taxa percentual, imposto e margem nao podem somar 100% ou mais')
  }

  if (divisorLucro <= 0) {
    throw new Error('Taxa percentual e imposto nao podem somar 100% ou mais')
  }

  const precoPorMargem =
    (custoBase + freteMedio + taxaFixa) / divisorMargem

  const precoPorLucro =
    (custoBase + freteMedio + taxaFixa + lucroMinimoCalculado) / divisorLucro

  const preco = Math.max(precoPorMargem, precoPorLucro)
  const valorTaxaPercentual = preco * taxaPercentual
  const valorImposto = preco * impostoPercentual
  const lucro =
    preco -
    custoBase -
    freteMedio -
    taxaFixa -
    valorTaxaPercentual -
    valorImposto

  return {
    preco_sugerido: Number(preco.toFixed(2)),
    lucro: Number(lucro.toFixed(2)),
    margem_real: Number((lucro / preco).toFixed(4))
  }
}

module.exports = {
  buscarTaxaPorMarketplace,
  calcularPrecoComTaxas,
  normalizarMarketplace,
  normalizarPercentual,
  normalizarValorMonetario
}
