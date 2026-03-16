const { parseStringPromise } = require('xml2js')

function toArray(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (value === undefined || value === null) {
    return []
  }

  return [value]
}

function getFirst(value) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parseXmlNumber(value) {
  const text = String(getFirst(value) || '').trim().replace(',', '.')
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseXml({ buffer }) {
  const content = String(buffer || '').trim()

  if (!content) {
    throw new Error('Arquivo XML vazio ou invalido')
  }

  return parseStringPromise(content, {
    explicitArray: true,
    trim: true
  }).then((parsed) => {
    const nfe = parsed?.nfeProc?.NFe?.[0] || parsed?.NFe?.[0] || parsed?.NFe || parsed?.nfeProc?.NFe
    const detalhes = toArray(nfe?.infNFe?.[0]?.det || nfe?.infNFe?.det)

    if (!detalhes.length) {
      throw new Error('XML sem itens de produto reconhecidos')
    }

    return detalhes.map((detalhe, index) => {
      const prod = detalhe?.prod?.[0] || detalhe?.prod || {}
      const quantidade = parseXmlNumber(prod.qCom || prod.qTrib) || 1
      const valorTotal = parseXmlNumber(prod.vProd)
      const valorUnitario = parseXmlNumber(prod.vUnCom || prod.vUnTrib) || (quantidade > 0 ? valorTotal / quantidade : 0)

      return {
        linha: index + 1,
        sku: getFirst(prod.cProd),
        nome: getFirst(prod.xProd),
        ean: getFirst(prod.cEAN) || getFirst(prod.cEANTrib),
        custo: valorUnitario,
        preco_venda: 0,
        margem_desejada: 0,
        categoria: ''
      }
    })
  })
}

module.exports = parseXml
