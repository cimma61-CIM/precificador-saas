function createValidationError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function validarProduto(produto) {
  if (!produto.sku) {
    throw createValidationError(`Linha ${produto.linha}: SKU obrigatorio`)
  }

  if (!produto.nome) {
    throw createValidationError(`Linha ${produto.linha}: nome obrigatorio`)
  }

  if (!Number.isFinite(produto.custo) || produto.custo < 0) {
    throw createValidationError(`Linha ${produto.linha}: custo invalido`)
  }

  if (!Number.isFinite(produto.preco_venda) || produto.preco_venda < 0) {
    throw createValidationError(`Linha ${produto.linha}: preco_venda invalido`)
  }

  if (!Number.isFinite(produto.margem_desejada) || produto.margem_desejada < 0) {
    throw createValidationError(`Linha ${produto.linha}: margem_desejada invalida`)
  }

  if (produto.ean && !/^[0-9]{8,14}$/.test(produto.ean)) {
    throw createValidationError(`Linha ${produto.linha}: EAN invalido`)
  }

  return produto
}

module.exports = validarProduto
