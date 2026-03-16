const XLSX = require('xlsx')
const {
  analisarArquivo,
  createValidationError,
  importarArquivo
} = require('../importacao/importador')

const CABECALHOS_MODELO = ['sku', 'nome', 'ean', 'custo', 'preco_venda', 'margem_desejada', 'categoria']

function buildTemplateWorkbook() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    CABECALHOS_MODELO,
    ['CAM-001', 'Camiseta Preta', '7891234567890', 25, 59.9, 40, 'Roupas']
  ])
  const workbook = XLSX.utils.book_new()

  worksheet.C2 = {
    t: 's',
    v: '7891234567890'
  }
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 32 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 }
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function analisarImportacao(usuarioId, arquivo) {
  return analisarArquivo(usuarioId, arquivo)
}

async function confirmarImportacao(usuarioId, arquivo) {
  return importarArquivo(usuarioId, arquivo)
}

module.exports = {
  analisarImportacao,
  buildTemplateWorkbook,
  confirmarImportacao,
  createValidationError
}
