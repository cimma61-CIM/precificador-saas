const express = require('express')
const router = express.Router()

const {
  handleListarContatos,
  handleBuscarContato,
  handleCriarContato,
  handleAtualizarContato,
  handleDeletarContato
} = require('../controllers/contatosController')

// ===============================
// GET /contatos
// ===============================
router.get('/', handleListarContatos)

// ===============================
// GET /contatos/:id
// ===============================
router.get('/:id', handleBuscarContato)

// ===============================
// POST /contatos
// ===============================
router.post('/', handleCriarContato)

// ===============================
// PUT /contatos/:id
// ===============================
router.put('/:id', handleAtualizarContato)

// ===============================
// DELETE /contatos/:id
// ===============================
router.delete('/:id', handleDeletarContato)

module.exports = router