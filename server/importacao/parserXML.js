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

function normalizarDataXml(value) {
  const raw = String(getFirst(value) || '').trim()

  if (!raw) {
    return ''
  }

  const data = new Date(raw)

  if (Number.isNaN(data.getTime())) {
    return ''
  }

  return data.toISOString().slice(0, 10)
}

function extrairNotaFiscal(parsed) {
  const nfe = parsed?.nfeProc?.NFe?.[0] || parsed?.NFe?.[0] || parsed?.NFe || parsed?.nfeProc?.NFe
  const infNFe = nfe?.infNFe?.[0] || nfe?.infNFe || {}
  const emit = infNFe?.emit?.[0] || infNFe?.emit || {}
  const ide = infNFe?.ide?.[0] || infNFe?.ide || {}
  const detalhes = toArray(infNFe?.det || [])

  if (!detalhes.length) {
    throw new Error('XML sem itens de produto reconhecidos')
  }

  return {
    fornecedor: String(getFirst(emit.xNome) || '').trim(),
    data: normalizarDataXml(ide.dhEmi || ide.dEmi),
    itens: detalhes.map((detalhe, index) => {
      const prod = detalhe?.prod?.[0] || detalhe?.prod || {}
      const quantidade = parseXmlNumber(prod.qCom || prod.qTrib) || 1
      const valorTotal = parseXmlNumber(prod.vProd)
      const valorUnitario = parseXmlNumber(prod.vUnCom || prod.vUnTrib) || (quantidade > 0 ? valorTotal / quantidade : 0)

      return {
        linha: index + 1,
        sku: getFirst(prod.cProd),
        codigo_fornecedor: String(getFirst(prod.cProd) || '').trim(),
        fornecedor: String(getFirst(emit.xNome) || '').trim(),
        nome: getFirst(prod.xProd),
        ean: getFirst(prod.cEAN) || getFirst(prod.cEANTrib),
        quantidade,
        custo_unitario: Number(valorUnitario.toFixed(2)),
        custo: Number(valorUnitario.toFixed(2)),
        preco_venda: 0,
        margem_desejada: 0,
        categoria: ''
      }
    })
  }
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
    return extrairNotaFiscal(parsed).itens.map(({ quantidade, custo_unitario, codigo_fornecedor, fornecedor, ...item }) => item)
  })
}

async function parseXmlCompra(arquivo) {
  const content = String(arquivo?.buffer || '').trim()

  if (!content) {
    throw new Error('Arquivo XML vazio ou invalido')
  }

  const parsed = await parseStringPromise(content, {
    explicitArray: true,
    trim: true
  })

  return extrairNotaFiscal(parsed)
}

module.exports = parseXml
module.exports.parseXmlCompra = parseXmlCompra
