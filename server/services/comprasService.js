const pool = require('../db')
const { normalizarValorMonetario } = require('./precoService')
const { registrarHistoricoProduto } = require('./historicoProdutosService')
const { buscarContatoPorId } = require('./contatosService')

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
    SELECT id, usuario_id, data, fornecedor_id, created_at
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
    const fornecedorId = Number(dadosCompra.fornecedor_id ?? dadosCompra.contato_id)
    const campoContato = dadosCompra.fornecedor_id !== undefined ? 'Fornecedor_id' : 'Contato_id'

    if (!Number.isInteger(fornecedorId) || fornecedorId <= 0) {
      throw new Error(`${campoContato} invalido`)
    }

    const contato = await buscarContatoPorId(usuarioId, fornecedorId)

    if (!contato) {
      throw new Error('Contato nao encontrado')
    }

    if (!['fornecedor', 'ambos'].includes(contato.tipo)) {
      throw new Error('Contato deve ser fornecedor ou ambos')
    }

    const result = await client.query(
      `
      INSERT INTO compras (usuario_id, data, fornecedor_id)
      VALUES ($1, $2, $3)
      RETURNING id, usuario_id, data, fornecedor_id, created_at
      `,
      [usuarioId, dataCompra, fornecedorId]
    )

    const compra = result.rows[0]
    const itensCriados = []

    if (Array.isArray(dadosCompra.itens) && dadosCompra.itens.length > 0) {
      for (const item of dadosCompra.itens) {
        const resultadoItem = await adicionarItemCompra(usuarioId, compra.id, item, client)
        itensCriados.push(resultadoItem.item)
      }
    }

    if (deveGerenciarTransacao) {
      await client.query('COMMIT')
    }

    return {
      compra,
      itens: itensCriados
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

async function atualizarCompra(usuarioId, compraId, dadosCompra = {}, clientExterno = null) {
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

    const dataCompra = normalizarDataCompra(dadosCompra.data)
    const fornecedorId = Number(dadosCompra.fornecedor_id ?? dadosCompra.contato_id)
    const campoContato = dadosCompra.fornecedor_id !== undefined ? 'Fornecedor_id' : 'Contato_id'

    if (!Number.isInteger(fornecedorId) || fornecedorId <= 0) {
      throw new Error(`${campoContato} invalido`)
    }

    const contato = await buscarContatoPorId(usuarioId, fornecedorId)

    if (!contato) {
      throw new Error('Contato nao encontrado')
    }

    if (!['fornecedor', 'ambos'].includes(contato.tipo)) {
      throw new Error('Contato deve ser fornecedor ou ambos')
    }

    await client.query(
      `
      UPDATE compras
      SET data = $1,
          fornecedor_id = $2
      WHERE id = $3
        AND usuario_id = $4
      `,
      [dataCompra, fornecedorId, compraId, usuarioId]
    )

    await client.query(
      `
      DELETE FROM compras_itens
      WHERE compra_id = $1
      `,
      [compraId]
    )

    const itensAtualizados = []

    if (Array.isArray(dadosCompra.itens) && dadosCompra.itens.length > 0) {
      for (const item of dadosCompra.itens) {
        const produtoId = Number(item.produto_id)

        if (!Number.isInteger(produtoId) || produtoId <= 0) {
          throw new Error('Produto invalido')
        }

        const quantidade = normalizarQuantidade(item.quantidade)
        const custoUnitario = normalizarValorMonetario(item.custo_unitario, 'Custo unitario')
        const produtoAtual = await carregarProdutoParaCompra(client, produtoId, usuarioId)

        if (!produtoAtual) {
          throw new Error('Produto nao encontrado')
        }

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
          [compraId, produtoId, quantidade, custoUnitario]
        )

        itensAtualizados.push(itemResult.rows[0])
      }
    }

    if (deveGerenciarTransacao) {
      await client.query('COMMIT')
    }

    return {
      compra: {
        id: compra.id,
        usuario_id: compra.usuario_id,
        data: dataCompra,
        fornecedor_id: fornecedorId,
        created_at: compra.created_at
      },
      itens: itensAtualizados
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
  criarCompra,
  atualizarCompra
}
