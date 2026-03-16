function normalizarTexto(value) {
  return String(value || '').trim()
}

function normalizarSku(value) {
  const sku = normalizarTexto(value).toUpperCase()
  return sku || ''
}

function normalizarEan(value) {
  const ean = normalizarTexto(value).replace(/\s+/g, '')
  return ean || ''
}

function normalizarNumero(value) {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN
  }

  const bruto = String(value).trim()
  const texto = bruto.includes(',') && bruto.includes('.')
    ? bruto.replace(/\./g, '').replace(',', '.')
    : bruto.replace(',', '.')

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : NaN
}

function normalizarProduto(produto = {}, contexto = {}) {
  return {
    linha: Number(contexto.linha || produto.linha || 0),
    sku: normalizarSku(produto.sku),
    nome: normalizarTexto(produto.nome),
    ean: normalizarEan(produto.ean),
    custo: normalizarNumero(produto.custo),
    preco_venda: normalizarNumero(produto.preco_venda),
    margem_desejada: normalizarNumero(produto.margem_desejada),
    categoria: normalizarTexto(produto.categoria)
  }
}

module.exports = normalizarProduto
