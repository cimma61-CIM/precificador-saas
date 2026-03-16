const { from: copyFrom } = require('pg-copy-streams')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}

function buildCsvRows(produtos) {
  return produtos
    .map((produto) => (
      [
        produto.sku,
        produto.nome,
        produto.ean || '',
        produto.custo,
        produto.preco_venda,
        produto.margem_desejada,
        produto.categoria_id || '',
        produto.acao
      ].map(escapeCsvValue).join(',')
    ))
    .join('\n')
}

async function copyToTempTable(client, produtos) {
  if (!produtos.length) {
    return
  }

  await client.query(`
    CREATE TEMP TABLE tmp_importacao_produtos (
      sku TEXT,
      nome TEXT,
      ean TEXT,
      custo NUMERIC(10,2),
      preco_venda NUMERIC(10,2),
      margem_desejada NUMERIC(10,4),
      categoria_id INTEGER,
      acao TEXT
    ) ON COMMIT DROP;
  `)

  const csvRows = buildCsvRows(produtos)
  const copyStream = client.query(copyFrom(`
    COPY tmp_importacao_produtos (
      sku,
      nome,
      ean,
      custo,
      preco_venda,
      margem_desejada,
      categoria_id,
      acao
    ) FROM STDIN WITH (FORMAT csv)
  `))

  await pipeline(
    Readable.from([csvRows]),
    copyStream
  )
}

async function inserirProdutos(client, usuarioId, produtos) {
  if (!produtos.length) {
    return {
      inseridos: 0,
      atualizados: 0
    }
  }

  await copyToTempTable(client, produtos)

  const updateResult = await client.query(
    `
    UPDATE produtos p
    SET
      nome = tmp.nome,
      ean = NULLIF(tmp.ean, ''),
      barcode = NULLIF(tmp.ean, ''),
      custo = tmp.custo,
      preco = tmp.preco_venda,
      preco_venda = tmp.preco_venda,
      margem = tmp.margem_desejada,
      margem_desejada = tmp.margem_desejada,
      categoria_id = tmp.categoria_id
    FROM tmp_importacao_produtos tmp
    WHERE tmp.acao = 'update'
      AND p.usuario_id = $1
      AND p.sku = tmp.sku
    `,
    [usuarioId]
  )

  const insertResult = await client.query(
    `
    INSERT INTO produtos (
      usuario_id,
      nome,
      sku,
      ean,
      barcode,
      categoria_id,
      custo,
      preco,
      preco_venda,
      margem,
      margem_desejada
    )
    SELECT
      $1,
      tmp.nome,
      tmp.sku,
      NULLIF(tmp.ean, ''),
      NULLIF(tmp.ean, ''),
      tmp.categoria_id,
      tmp.custo,
      tmp.preco_venda,
      tmp.preco_venda,
      tmp.margem_desejada,
      tmp.margem_desejada
    FROM tmp_importacao_produtos tmp
    WHERE tmp.acao = 'insert'
    `,
    [usuarioId]
  )

  return {
    inseridos: insertResult.rowCount || 0,
    atualizados: updateResult.rowCount || 0
  }
}

module.exports = inserirProdutos
