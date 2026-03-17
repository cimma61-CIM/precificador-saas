async function registrarHistoricoProduto(client, produtoId, usuarioId) {
  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    throw new Error('produto_id invalido para historico')
  }

  const result = await client.query(
    `
    INSERT INTO historico_produtos (
      produto_id,
      usuario_id,
      sku,
      nome,
      ean,
      custo,
      preco_venda,
      margem
    )
    SELECT
      p.id,
      p.usuario_id,
      p.sku,
      p.nome,
      COALESCE(NULLIF(TRIM(p.ean), ''), NULLIF(TRIM(p.barcode), '')) AS ean,
      p.custo,
      p.preco_venda,
      p.margem
    FROM produtos p
    WHERE p.id = $1
      AND p.usuario_id = $2
    LIMIT 1
    `,
    [produtoId, usuarioId]
  )

  if ((result.rowCount || 0) === 0) {
    throw new Error('Produto nao encontrado para registrar historico')
  }
}

async function registrarHistoricoProdutosImportados(client, usuarioId) {
  await client.query(
    `
    INSERT INTO historico_produtos (
      produto_id,
      usuario_id,
      sku,
      nome,
      ean,
      custo,
      preco_venda,
      margem
    )
    SELECT
      p.id,
      p.usuario_id,
      p.sku,
      p.nome,
      COALESCE(NULLIF(TRIM(p.ean), ''), NULLIF(TRIM(p.barcode), '')) AS ean,
      p.custo,
      p.preco_venda,
      p.margem
    FROM produtos p
    INNER JOIN tmp_importacao_produtos tmp
      ON tmp.sku = p.sku
    WHERE p.usuario_id = $1
      AND tmp.acao IN ('insert', 'update')
    `,
    [usuarioId]
  )
}

module.exports = {
  registrarHistoricoProduto,
  registrarHistoricoProdutosImportados
}
