const XLSX = require('xlsx')

function normalizarCabecalho(value) {
  return String(value || '').trim().toLowerCase()
}

function parseExcel({ buffer }) {
  if (!buffer || !buffer.length) {
    throw new Error('Arquivo Excel vazio ou invalido')
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('Planilha sem abas validas')
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })

  return rows.map((row, index) => {
    const normalizedRow = {}

    for (const [key, value] of Object.entries(row)) {
      normalizedRow[normalizarCabecalho(key)] = value
    }

    return {
      linha: index + 2,
      sku: normalizedRow.sku,
      nome: normalizedRow.nome,
      ean: normalizedRow.ean,
      custo: normalizedRow.custo,
      preco_venda: normalizedRow.preco_venda,
      margem_desejada: normalizedRow.margem_desejada ?? normalizedRow.margem,
      categoria: normalizedRow.categoria
    }
  })
}

module.exports = parseExcel
