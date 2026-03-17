const express = require('express')
const router = express.Router()
const pool = require('../db')
const {
  normalizarCodigoFornecedor,
  normalizarFornecedor,
  salvarVinculo
} = require('../services/produtoFornecedorService')

function normalizarProdutoId(valor) {
  const numero = Number.parseInt(valor, 10)
  return Number.isInteger(numero) && numero > 0 ? numero : null
}

async function produtoExiste(usuarioId, produtoId) {
  const result = await pool.query(
    `
    SELECT id
    FROM produtos
    WHERE id = $1
      AND usuario_id = $2
    LIMIT 1
    `,
    [produtoId, usuarioId]
  )

  return result.rows.length > 0
}

router.post('/', async (req, res) => {
  const usuarioId = req.user.id
  const produtoId = normalizarProdutoId(req.body.produto_id)
  const fornecedor = normalizarFornecedor(req.body.fornecedor)
  const codigoFornecedor = normalizarCodigoFornecedor(req.body.codigo_fornecedor)

  if (!produtoId) {
    return res.status(400).json({ erro: 'produto_id invalido' })
  }

  if (!fornecedor) {
    return res.status(400).json({ erro: 'fornecedor e obrigatorio' })
  }

  if (!codigoFornecedor) {
    return res.status(400).json({ erro: 'codigo_fornecedor e obrigatorio' })
  }

  try {
    if (!(await produtoExiste(usuarioId, produtoId))) {
      return res.status(404).json({ erro: 'Produto nao encontrado' })
    }

    await salvarVinculo(usuarioId, produtoId, fornecedor, codigoFornecedor)

    return res.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao salvar vinculo produto-fornecedor' })
  }
})

module.exports = router
