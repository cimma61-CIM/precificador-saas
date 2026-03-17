const pool = require('../db')
const { normalizarValorMonetario } = require('./precoService')
const { registrarHistoricoProduto } = require('./historicoProdutosService')

function normalizarTexto(valor, campo) {
  const texto = String(valor || '').trim()

  if (!texto) {
    throw new Error(`${campo} e obrigatorio`)
  }

  return texto
}

function normalizarDataCompra(valor) {
  const texto = String(valor || '').trim()

  if (!texto) {
    return new Date().toISOString().slice(0, 10)
  }

  const data = new Date(texto)

  if (Number.isNaN(data.getTime())) {
    throw new Error('Data da compra invalida')
  }

  return data.toISOString().slice(0, 10)
}

function normalizarQuantidade(valor) {
  const numero = Number(valor)

  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error('Quantidade deve ser um inteiro maior que zero')
  }

  return numero
}

function calcularCustoMedio({ quantidadeAtual, custoAtual, quantidadeNova, custoUnitario }) {
  const quantidadeBase = Number(quantidadeAtual || 0)
  const custoBase = Number(custoAtual || 0)
  const totalQuantidade = quantidadeBase + quantidadeNova

  if (totalQuantidade <= 0) {
    return 0
  }

  const novoCusto = (
    ((quantidadeBase * custoBase) + (quantidadeNova * custoUnitario)) /
    totalQuantidade
  )

  return Number(novoCusto.toFixed(2))
}

async function carregarCompra(client, compraId, usuarioId) {
  const result = await client.query(
    `
    SELECT id, usuario_id, data, fornecedor, created_at
    FROM compras
    WHERE id = $1
      AND usuario_id = $2
    LIMIT 1
    `,
    [compraId, usuarioId]
  )

  return result.rows[0] || null
}

async function carregarProdutoParaCompra(client, produtoId, usuarioId) {
  const result = await client.query(
    `
    SELECT id, usuario_id, sku, nome, ean, custo, quantidade
    FROM produtos
    WHERE id = $1
      AND usuario_id = $2
    LIMIT 1
    FOR UPDATE
    `,
    [produtoId, usuarioId]
  )

  return result.rows[0] || null
}

async function criarCompra(usuarioId, dadosCompra = {}, clientExterno = null) {
  const client = clientExterno || await pool.connect()
  const deveGerenciarTransacao = !clientExterno

  try {
    if (deveGerenciarTransacao) {
      await client.query('BEGIN')
    }

    const dataCompra = normalizarDataCompra(dadosCompra.data)
    const fornecedor = normalizarTexto(dadosCompra.fornecedor, 'Fornecedor')

    const result = await client.query(
      `
      INSERT INTO compras (usuario_id, data, fornecedor)
      VALUES ($1, $2, $3)
      RETURNING id, usuario_id, data, fornecedor, created_at
      `,
      [usuarioId, dataCompra, fornecedor]
    )

    if (deveGerenciarTransacao) {
      await client.query('COMMIT')
    }

    return result.rows[0]
  } catch (error) {
    if (deveGerenciarTransacao) {
      await client.query('ROLLBACK')
    }

    throw error
  } finally {
    if (!clientExterno) {
      client.release()
    }
  }
}

async function adicionarItemCompra(usuarioId, compraId, item = {}, clientExterno = null) {
  const client = clientExterno || await pool.connect()
  const deveGerenciarTransacao = !clientExterno

  try {
    if (deveGerenciarTransacao) {
      await client.query('BEGIN')
    }

    const compra = await carregarCompra(client, Number(compraId), usuarioId)

    if (!compra) {
      throw new Error('Compra nao encontrada')
    }

    const produtoId = Number(item.produto_id)

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error('Produto invalido')
    }

    const quantidadeNova = normalizarQuantidade(item.quantidade)
    const custoUnitario = normalizarValorMonetario(item.custo_unitario, 'Custo unitario')
    const produtoAtual = await carregarProdutoParaCompra(client, produtoId, usuarioId)

    if (!produtoAtual) {
      throw new Error('Produto nao encontrado')
    }

    const quantidadeAtual = Number(produtoAtual.quantidade || 0)
    const custoAtual = Number(produtoAtual.custo || 0)
    const novoCusto = calcularCustoMedio({
      quantidadeAtual,
      custoAtual,
      quantidadeNova,
      custoUnitario
    })
    const novaQuantidade = quantidadeAtual + quantidadeNova

    const itemResult = await client.query(
      `
      INSERT INTO compras_itens (
        compra_id,
        produto_id,
        quantidade,
        custo_unitario
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, compra_id, produto_id, quantidade, custo_unitario
      `,
      [compra.id, produtoId, quantidadeNova, custoUnitario]
    )

    await client.query(
      `
      UPDATE produtos
      SET
        custo = $1,
        quantidade = $2
      WHERE id = $3
        AND usuario_id = $4
      `,
      [novoCusto, novaQuantidade, produtoId, usuarioId]
    )

    await registrarHistoricoProduto(client, produtoId, usuarioId)

    if (deveGerenciarTransacao) {
      await client.query('COMMIT')
    }

    return {
      compra,
      item: itemResult.rows[0],
      produto: {
        id: produtoId,
        custo_anterior: custoAtual,
        custo_atualizado: novoCusto,
        quantidade_anterior: quantidadeAtual,
        quantidade_atualizada: novaQuantidade
      }
    }
  } catch (error) {
    if (deveGerenciarTransacao) {
      await client.query('ROLLBACK')
    }

    throw error
  } finally {
    if (!clientExterno) {
      client.release()
    }
  }
}

module.exports = {
  adicionarItemCompra,
  calcularCustoMedio,
  criarCompra
}
