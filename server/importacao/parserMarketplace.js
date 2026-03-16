async function parseMarketplace(input = {}) {
  const produtos = Array.isArray(input.produtos) ? input.produtos : []

  return produtos.map((produto, index) => ({
    linha: index + 1,
    sku: produto.sku,
    nome: produto.nome,
    ean: produto.ean,
    custo: produto.custo,
    preco_venda: produto.preco_venda,
    margem_desejada: produto.margem_desejada,
    categoria: produto.categoria
  }))
}

module.exports = parseMarketplace
