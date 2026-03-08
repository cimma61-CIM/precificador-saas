require('dotenv').config({ path: __dirname + '/.env' })

console.log("DATABASE_URL =", process.env.DATABASE_URL)

const pool = require('./db')

async function createTable() {

  const query = `
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100),
      nome VARCHAR(255),
      preco_custo NUMERIC(10,2),
      preco_venda NUMERIC(10,2),
      marketplace VARCHAR(50),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(query);
    console.log("Tabela produtos criada com sucesso!");
  } catch (err) {
    console.error("Erro ao criar tabela:", err);
  } finally {
    pool.end();
  }
}

createTable();