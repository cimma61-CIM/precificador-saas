require('dotenv').config();
const pool = require('../db');

const comprasService = require('../services/comprasService');

async function testarCompra() {
  try {
    const usuario_id = 1;

    // 1️⃣ criar produto
    const produto = await pool.query(`
      INSERT INTO produtos (usuario_id, sku, nome, custo, quantidade)
      VALUES ($1, 'TESTE-CUSTO', 'Produto Teste', 10, 10)
      RETURNING *;
    `, [usuario_id]);

    const produto_id = produto.rows[0].id;

    console.log('Produto inicial:', produto.rows[0]);

    // 2️⃣ criar compra (AGORA antes de usar)
    const compra = await comprasService.criarCompra(
      usuario_id,
      {
        fornecedor: 'Fornecedor Teste'
      }
    );

    console.log('Compra criada:', compra);

    // 3️⃣ adicionar item
    await comprasService.adicionarItemCompra(
      usuario_id,
      compra.id,
      {
        produto_id,
        quantidade: 20,
        custo_unitario: 20
      }
    );

    // 4️⃣ verificar produto atualizado
    const produtoAtualizado = await pool.query(
      `SELECT * FROM produtos WHERE id = $1`,
      [produto_id]
    );

    console.log('Produto atualizado:', produtoAtualizado.rows[0]);

    // 5️⃣ verificar histórico
    const historico = await pool.query(
      `SELECT * FROM historico_produtos WHERE produto_id = $1`,
      [produto_id]
    );

    console.log('Histórico:', historico.rows);

  } catch (erro) {
    console.error('Erro no teste:', erro);
  } finally {
    process.exit();
  }
}

testarCompra();