const XLSX = require('xlsx')
const pool = require('../db')
const { parseXmlCompra } = require('../importacao/parserXML')
const {
  analisarArquivo,
  createValidationError,
  detectarTipoArquivo,
  importarArquivo
} = require('../importacao/importador')
const { adicionarItemCompra, criarCompra } = require('./comprasService')
const {
  carregarProdutosPorFornecedorECodigo,
  montarChaveFornecedor,
  normalizarCodigoFornecedor,
  normalizarFornecedor
} = require('./produtoFornecedorService')

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

function montarErroXml(item, erro) {
  return {
    linha: item.linha,
    sku: item.sku || '',
    nome: item.nome || '',
    ean: item.ean || '',
    fornecedor: item.fornecedor || '',
    codigo_fornecedor: item.codigo_fornecedor || '',
    erro
  }
}

function montarItemNaoIdentificado(item, motivo) {
  return {
    linha: item.linha,
    nome: item.nome || '',
    ean: item.ean || '',
    fornecedor: item.fornecedor || '',
    codigo_fornecedor: item.codigo_fornecedor || '',
    quantidade: Number(item.quantidade || 0),
    custo_unitario: Number(item.custo_unitario || 0),
    motivo
  }
}

function montarItemIdentificado(item, produto) {
  return {
    linha: item.linha,
    nome: item.nome || '',
    ean: item.ean || '',
    fornecedor: item.fornecedor || '',
    codigo_fornecedor: item.codigo_fornecedor || '',
    quantidade: Number(item.quantidade || 0),
    custo_unitario: Number(item.custo_unitario || 0),
    produto_id: produto.produto_id,
    produto_nome: produto.nome || '',
    produto_sku: produto.sku || ''
  }
}

async function analisarImportacaoXml(usuarioId, arquivo) {
  const nota = await parseXmlCompra(arquivo)
  const produtosPorFornecedorECodigo = await carregarProdutosPorFornecedorECodigo(usuarioId, nota.itens)
  const erros = []
  const itensIdentificados = []
  const itensNaoIdentificados = []
  let itensEncontrados = 0

  for (const item of nota.itens) {
    const fornecedor = normalizarFornecedor(item.fornecedor || nota.fornecedor)
    const codigoFornecedor = normalizarCodigoFornecedor(item.codigo_fornecedor)
    const chave = montarChaveFornecedor(fornecedor, codigoFornecedor)

    if (!fornecedor || !codigoFornecedor) {
      const mensagem = !fornecedor
        ? 'Fornecedor nao informado no XML'
        : 'Codigo do fornecedor nao informado no XML'
      erros.push(montarErroXml(item, mensagem))
      itensNaoIdentificados.push(montarItemNaoIdentificado(item, mensagem))
      continue
    }

    if (!produtosPorFornecedorECodigo.has(chave)) {
      const mensagem = 'Produto nao identificado por fornecedor e codigo do fornecedor'
      erros.push(montarErroXml(item, mensagem))
      itensNaoIdentificados.push(montarItemNaoIdentificado(item, mensagem))
      continue
    }

    itensIdentificados.push(montarItemIdentificado(item, produtosPorFornecedorECodigo.get(chave)))
    itensEncontrados += 1
  }

  return {
    tipo_importacao: 'xml_compra',
    fornecedor: nota.fornecedor || '',
    data: nota.data || '',
    total_itens_xml: nota.itens.length,
    itens_encontrados: itensEncontrados,
    itens_nao_encontrados: erros.length,
    itens_identificados: itensIdentificados,
    itens_nao_identificados: itensNaoIdentificados,
    erros
  }
}

async function confirmarImportacaoXml(usuarioId, arquivo) {
  const nota = await parseXmlCompra(arquivo)
  const produtosPorFornecedorECodigo = await carregarProdutosPorFornecedorECodigo(usuarioId, nota.itens)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const compra = await criarCompra(usuarioId, {
      fornecedor: nota.fornecedor || 'Fornecedor XML',
      data: nota.data || undefined
    }, client)

    const erros = []
    const itensIdentificados = []
    const itensNaoIdentificados = []
    let itensProcessados = 0

    for (const item of nota.itens) {
      const fornecedor = normalizarFornecedor(item.fornecedor || nota.fornecedor)
      const codigoFornecedor = normalizarCodigoFornecedor(item.codigo_fornecedor)
      const chave = montarChaveFornecedor(fornecedor, codigoFornecedor)

      if (!fornecedor || !codigoFornecedor) {
        const mensagem = !fornecedor
          ? 'Fornecedor nao informado no XML'
          : 'Codigo do fornecedor nao informado no XML'
        erros.push(montarErroXml(item, mensagem))
        itensNaoIdentificados.push(montarItemNaoIdentificado(item, mensagem))
        continue
      }

      const produto = produtosPorFornecedorECodigo.get(chave)

      if (!produto) {
        const mensagem = 'Produto nao identificado por fornecedor e codigo do fornecedor'
        erros.push(montarErroXml(item, mensagem))
        itensNaoIdentificados.push(montarItemNaoIdentificado(item, mensagem))
        continue
      }

      try {
        await adicionarItemCompra(usuarioId, compra.id, {
          produto_id: produto.id,
          quantidade: item.quantidade,
          custo_unitario: item.custo_unitario
        }, client)
        itensIdentificados.push(montarItemIdentificado(item, produto))
        itensProcessados += 1
      } catch (error) {
        erros.push(montarErroXml(item, error.message || 'Falha ao processar item do XML'))
      }
    }

    await client.query('COMMIT')

    return {
      tipo_importacao: 'xml_compra',
      compra,
      importados: 0,
      atualizados: 0,
      itens_processados: itensProcessados,
      itens_nao_processados: erros.length,
      itens_identificados: itensIdentificados,
      itens_nao_identificados: itensNaoIdentificados,
      erros
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function analisarImportacao(usuarioId, arquivo) {
  if (detectarTipoArquivo(arquivo) === 'xml') {
    return analisarImportacaoXml(usuarioId, arquivo)
  }

  return analisarArquivo(usuarioId, arquivo)
}

async function confirmarImportacao(usuarioId, arquivo) {
  if (detectarTipoArquivo(arquivo) === 'xml') {
    return confirmarImportacaoXml(usuarioId, arquivo)
  }

  return importarArquivo(usuarioId, arquivo)
}

module.exports = {
  analisarImportacao,
  buildTemplateWorkbook,
  confirmarImportacao,
  createValidationError
}
