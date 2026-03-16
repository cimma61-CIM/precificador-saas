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

function calcularIndiceExtraPercentual(indicesExtras) {
  const textoOriginal = String(indicesExtras || '').trim()

  if (!textoOriginal) {
    return {
      indicesExtras: '',
      indiceExtraPercentual: 0
    }
  }

  const partes = textoOriginal
    .replace(/[;|/]+/g, '+')
    .split('+')
    .map((parte) => parte.trim())
    .filter(Boolean)

  if (partes.length === 0) {
    return {
      indicesExtras: '',
      indiceExtraPercentual: 0
    }
  }

  let total = 0
  const normalizados = []

  for (const parte of partes) {
    const valorNormalizado = parte.replace(',', '.')
    const numero = Number(valorNormalizado)

    if (Number.isNaN(numero) || numero < 0) {
      throw new Error('Indices extras devem conter apenas percentuais validos separados por +')
    }

    total += numero / 100
    normalizados.push(parte)
  }

  return {
    indicesExtras: normalizados.join(' + '),
    indiceExtraPercentual: Number(total.toFixed(4))
  }
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
      COALESCE(tm.indices_extras, '') AS indices_extras,
      COALESCE(tm.indice_extra_percentual, 0) AS indice_extra_percentual,
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

// Calculadora central de precificacao.
// Esta funcao deve permanecer pura: recebe apenas parametros numericos/contextuais
// ja resolvidos por outras camadas e retorna o resultado matematico sem acessar
// banco, rotas HTTP ou estado externo.
function calcularPrecoComTaxas({ custo, margem, taxa, lucro_minimo = 0, lucroMinimo = 0 }) {
  const custoBase = normalizarValorMonetario(custo, 'Custo')
  const margemDesejada = normalizarPercentual(margem)
  const lucroMinimoCalculado = normalizarValorMonetario(
    lucro_minimo || lucroMinimo,
    'Lucro minimo'
  )
  const taxaPercentual = normalizarPercentual(taxa.taxa_percentual)
  const indiceExtraPercentual = normalizarPercentual(taxa.indice_extra_percentual)
  const impostoPercentual = normalizarPercentual(taxa.imposto_percentual)
  const taxaFixa = normalizarValorMonetario(taxa.taxa_fixa, 'Taxa fixa')
  const freteMedio = normalizarValorMonetario(taxa.frete_medio, 'Frete medio')
  const taxasTotaisPercentuais =
    taxaPercentual + impostoPercentual + indiceExtraPercentual

  const divisorMargem =
    1 - taxasTotaisPercentuais - margemDesejada

  const divisorLucro =
    1 - taxasTotaisPercentuais

  if (divisorMargem <= 0) {
    throw new Error('Taxa percentual, imposto, indice extra e margem nao podem somar 100% ou mais')
  }

  if (divisorLucro <= 0) {
    throw new Error('Taxa percentual, imposto e indice extra nao podem somar 100% ou mais')
  }

  const precoPorMargem =
    (custoBase + freteMedio + taxaFixa) / divisorMargem

  const precoPorLucro =
    (custoBase + freteMedio + taxaFixa + lucroMinimoCalculado) / divisorLucro

  const preco = Math.max(precoPorMargem, precoPorLucro)
  const valorTaxaPercentual = preco * taxaPercentual
  const valorIndiceExtra = preco * indiceExtraPercentual
  const valorImposto = preco * impostoPercentual
  const lucro =
    preco -
    custoBase -
    freteMedio -
    taxaFixa -
    valorTaxaPercentual -
    valorIndiceExtra -
    valorImposto

  return {
    preco_sugerido: Number(preco.toFixed(2)),
    lucro: Number(lucro.toFixed(2)),
    margem_real: Number((lucro / preco).toFixed(4))
  }
}

module.exports = {
  buscarTaxaPorMarketplace,
  calcularIndiceExtraPercentual,
  calcularPrecoComTaxas,
  normalizarMarketplace,
  normalizarPercentual,
  normalizarValorMonetario
}
