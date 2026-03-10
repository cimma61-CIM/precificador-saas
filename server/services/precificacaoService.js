const pool = require('../db')
const { calcularPrecoComTaxas } = require('./precoService')

function recalcularPrecoProduto(produtoMarketplace, taxa) {
  const resultado = calcularPrecoComTaxas({
    custo: produtoMarketplace.custo,
    margem: produtoMarketplace.margem,
    taxa
  })

  return {
    ...produtoMarketplace,
    preco_calculado: resultado.preco_sugerido,
    lucro: resultado.lucro,
    margem_real: resultado.margem_real
  }
}

async function recalcularProdutos(usuarioId, produtoIds = []) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const filtros = ['pm.usuario_id = $1']
    const params = [usuarioId]

    if (produtoIds.length > 0) {
      params.push(produtoIds)
      filtros.push(`pm.produto_id = ANY($${params.length}::int[])`)
    }

    const produtosMarketplacesResult = await client.query(
      `
      SELECT
        pm.id,
        pm.produto_id,
        pm.usuario_id,
        pm.marketplace_id,
        pm.margem,
        pm.preco_calculado,
        p.nome,
        p.custo,
        m.slug AS marketplace_slug,
        m.nome AS marketplace_nome
      FROM produtos_marketplaces pm
      INNER JOIN produtos p
        ON p.id = pm.produto_id
      INNER JOIN marketplaces m
        ON m.id = pm.marketplace_id
      WHERE ${filtros.join(' AND ')}
      ORDER BY pm.produto_id ASC, pm.id ASC
      `,
      params
    )

    const taxasResult = await client.query(
      `
      SELECT
        tm.id,
        tm.usuario_id,
        tm.marketplace_id,
        tm.taxa_percentual,
        tm.taxa_fixa,
        tm.frete_medio,
        tm.imposto_percentual
      FROM taxas_marketplace tm
      WHERE tm.usuario_id = $1
      `,
      [usuarioId]
    )

    const taxasPorMarketplaceId = new Map(
      taxasResult.rows.map((taxa) => [Number(taxa.marketplace_id), taxa])
    )

    const atualizados = []
    const ignorados = []

    for (const item of produtosMarketplacesResult.rows) {
      const taxa = taxasPorMarketplaceId.get(Number(item.marketplace_id))

      if (!taxa) {
        await client.query(
          `
          UPDATE produtos_marketplaces
          SET preco_calculado = 0
          WHERE id = $1
          AND usuario_id = $2
          `,
          [item.id, usuarioId]
        )

        ignorados.push({
          produto_id: item.produto_id,
          nome: item.nome,
          marketplace: item.marketplace_slug,
          motivo: 'Taxa do marketplace nao cadastrada'
        })
        continue
      }

      try {
        const recalculado = recalcularPrecoProduto(item, taxa)

        await client.query(
          `
          UPDATE produtos_marketplaces
          SET preco_calculado = $1,
              margem = $2
          WHERE id = $3
          AND usuario_id = $4
          `,
          [
            recalculado.preco_calculado,
            item.margem,
            item.id,
            usuarioId
          ]
        )

        atualizados.push({
          produto_id: item.produto_id,
          nome: item.nome,
          marketplace: item.marketplace_slug,
          marketplace_id: item.marketplace_id,
          preco_anterior: Number(item.preco_calculado || 0),
          preco_novo: recalculado.preco_calculado,
          lucro: recalculado.lucro,
          margem_real: recalculado.margem_real
        })
      } catch (error) {
        await client.query(
          `
          UPDATE produtos_marketplaces
          SET preco_calculado = 0
          WHERE id = $1
          AND usuario_id = $2
          `,
          [item.id, usuarioId]
        )

        ignorados.push({
          produto_id: item.produto_id,
          nome: item.nome,
          marketplace: item.marketplace_slug,
          motivo: error.message
        })
      }
    }

    await client.query('COMMIT')

    return {
      total_produtos: new Set(produtosMarketplacesResult.rows.map((item) => item.produto_id)).size,
      total_marketplaces: produtosMarketplacesResult.rows.length,
      total_atualizados: atualizados.length,
      total_ignorados: ignorados.length,
      atualizados,
      ignorados
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function recalcularTodosProdutos(usuarioId) {
  return recalcularProdutos(usuarioId)
}

async function recalcularProdutoPorId(usuarioId, produtoId) {
  return recalcularProdutos(usuarioId, [produtoId])
}

module.exports = {
  recalcularPrecoProduto,
  recalcularTodosProdutos,
  recalcularProdutoPorId
}
