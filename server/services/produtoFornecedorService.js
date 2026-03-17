const pool = require('../db')

function normalizarFornecedor(valor) {
  return String(valor || '').trim().replace(/\s+/g, ' ')
}

function normalizarCodigoFornecedor(valor) {
  return String(valor || '').trim()
}

function montarChaveFornecedor(fornecedor, codigoFornecedor) {
  const fornecedorNormalizado = normalizarFornecedor(fornecedor).toLowerCase()
  const codigoNormalizado = normalizarCodigoFornecedor(codigoFornecedor).toLowerCase()

  if (!fornecedorNormalizado || !codigoNormalizado) {
    return ''
  }

  return `${fornecedorNormalizado}::${codigoNormalizado}`
}

async function carregarProdutosPorFornecedorECodigo(usuarioId, itens = [], client = pool) {
  const pares = []
  const chaves = new Set()

  for (const item of itens) {
    const fornecedor = normalizarFornecedor(item.fornecedor)
    const codigoFornecedor = normalizarCodigoFornecedor(item.codigo_fornecedor)
    const chave = montarChaveFornecedor(fornecedor, codigoFornecedor)

    if (!chave || chaves.has(chave)) {
      continue
    }

    chaves.add(chave)
    pares.push({ fornecedor, codigoFornecedor })
  }

  if (!pares.length) {
    return new Map()
  }

  const clauses = []
  const params = [usuarioId]

  for (const par of pares) {
    params.push(par.fornecedor, par.codigoFornecedor)
    clauses.push(`(LOWER(TRIM(pf.fornecedor)) = LOWER(TRIM($${params.length - 1})) AND LOWER(TRIM(pf.codigo_fornecedor)) = LOWER(TRIM($${params.length})))`)
  }

  const result = await client.query(
    `
    SELECT
      pf.produto_id,
      pf.fornecedor,
      pf.codigo_fornecedor,
      p.nome,
      p.sku
    FROM produto_fornecedor pf
    INNER JOIN produtos p
      ON p.id = pf.produto_id
     AND p.usuario_id = pf.usuario_id
    WHERE pf.usuario_id = $1
      AND (${clauses.join(' OR ')})
    `,
    params
  )

  return new Map(
    result.rows.map((row) => [
      montarChaveFornecedor(row.fornecedor, row.codigo_fornecedor),
      row
    ])
  )
}

async function salvarVinculoProdutoFornecedor({ produtoId, usuarioId, fornecedor, codigoFornecedor }, client = pool) {
  const fornecedorNormalizado = normalizarFornecedor(fornecedor)
  const codigoNormalizado = normalizarCodigoFornecedor(codigoFornecedor)

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    throw new Error('produto_id invalido para vinculo de fornecedor')
  }

  if (!fornecedorNormalizado || !codigoNormalizado) {
    throw new Error('Fornecedor e codigo_fornecedor sao obrigatorios para o vinculo')
  }

  const existente = await client.query(
    `
    SELECT id
    FROM produto_fornecedor
    WHERE usuario_id = $1
      AND LOWER(TRIM(fornecedor)) = LOWER(TRIM($2))
      AND LOWER(TRIM(codigo_fornecedor)) = LOWER(TRIM($3))
    LIMIT 1
    `,
    [usuarioId, fornecedorNormalizado, codigoNormalizado]
  )

  if (existente.rows.length > 0) {
    await client.query(
      `
      UPDATE produto_fornecedor
      SET produto_id = $1,
          fornecedor = $2,
          codigo_fornecedor = $3
      WHERE id = $4
      `,
      [produtoId, fornecedorNormalizado, codigoNormalizado, existente.rows[0].id]
    )
    return
  }

  await client.query(
    `
    INSERT INTO produto_fornecedor (
      produto_id,
      usuario_id,
      fornecedor,
      codigo_fornecedor
    )
    VALUES ($1, $2, $3, $4)
    `,
    [produtoId, usuarioId, fornecedorNormalizado, codigoNormalizado]
  )
}

async function salvarVinculo(usuarioId, produtoId, fornecedor, codigoFornecedor, client = pool) {
  await salvarVinculoProdutoFornecedor({
    produtoId,
    usuarioId,
    fornecedor,
    codigoFornecedor
  }, client)
}

module.exports = {
  carregarProdutosPorFornecedorECodigo,
  montarChaveFornecedor,
  normalizarCodigoFornecedor,
  normalizarFornecedor,
  salvarVinculo,
  salvarVinculoProdutoFornecedor
}
