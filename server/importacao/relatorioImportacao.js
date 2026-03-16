const XLSX = require('xlsx')

function gerarPlanilhaErros(erros) {
  if (!erros.length) {
    return null
  }

  const worksheet = XLSX.utils.json_to_sheet(erros)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Erros')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

function criarRelatorioImportacao({
  totalProcessado,
  inseridos,
  atualizados,
  erros
}) {
  const planilhaErros = gerarPlanilhaErros(erros)

  return {
    totalProcessado,
    inseridos,
    atualizados,
    erros: erros.length,
    detalhesErros: erros,
    arquivoErros: planilhaErros
      ? {
          nome: `importacao-erros-${Date.now()}.xlsx`,
          conteudoBase64: planilhaErros.toString('base64')
        }
      : null
  }
}

module.exports = criarRelatorioImportacao
