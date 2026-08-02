const {
  listarContatos,
  buscarContatoPorId,
  criarContato,
  atualizarContato,
  deletarContato
} = require('../services/contatosService')

// ✅ GET /contatos
async function handleListarContatos(req, res) {
  const usuarioId = req.user?.id

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Não autenticado' })
  }

  try {
    const contatos = await listarContatos(usuarioId)
    return res.json(contatos)
  } catch (error) {
    console.error('Erro ao listar contatos:', error)
    return res.status(500).json({ erro: 'Erro ao listar contatos' })
  }
}

// ✅ GET /contatos/:id
async function handleBuscarContato(req, res) {
  const usuarioId = req.user?.id
  const contatoId = Number.parseInt(req.params.id, 10)

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Não autenticado' })
  }

  if (!Number.isInteger(contatoId) || contatoId <= 0) {
    return res.status(400).json({ erro: 'ID inválido' })
  }

  try {
    const contato = await buscarContatoPorId(usuarioId, contatoId)

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' })
    }

    return res.json(contato)
  } catch (error) {
    console.error('Erro ao buscar contato:', error)
    return res.status(500).json({ erro: 'Erro ao buscar contato' })
  }
}

// ✅ POST /contatos
async function handleCriarContato(req, res) {
  const usuarioId = req.user?.id

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Não autenticado' })
  }

  try {
    const contato = await criarContato(usuarioId, req.body || {})
    return res.status(201).json(contato)
  } catch (error) {
    console.error('Erro ao criar contato:', error)

    // Validações
    const mensagens400 = new Set([
      'Nome é obrigatório',
      'Tipo é obrigatório',
      'Tipo deve ser cliente, fornecedor ou ambos'
    ])

    if (mensagens400.has(error.message)) {
      return res.status(400).json({ erro: error.message })
    }

    return res.status(500).json({ erro: 'Erro ao criar contato' })
  }
}

// ✅ PUT /contatos/:id
async function handleAtualizarContato(req, res) {
  const usuarioId = req.user?.id
  const contatoId = Number.parseInt(req.params.id, 10)

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Não autenticado' })
  }

  if (!Number.isInteger(contatoId) || contatoId <= 0) {
    return res.status(400).json({ erro: 'ID inválido' })
  }

  try {
    const contato = await atualizarContato(usuarioId, contatoId, req.body || {})
    return res.json(contato)
  } catch (error) {
    console.error('Erro ao atualizar contato:', error)

    if (error.message === 'Contato não encontrado') {
      return res.status(404).json({ erro: error.message })
    }

    const mensagens400 = new Set([
      'Tipo deve ser cliente, fornecedor ou ambos'
    ])

    if (mensagens400.has(error.message)) {
      return res.status(400).json({ erro: error.message })
    }

    return res.status(500).json({ erro: 'Erro ao atualizar contato' })
  }
}

// ✅ DELETE /contatos/:id
async function handleDeletarContato(req, res) {
  const usuarioId = req.user?.id
  const contatoId = Number.parseInt(req.params.id, 10)

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Não autenticado' })
  }

  if (!Number.isInteger(contatoId) || contatoId <= 0) {
    return res.status(400).json({ erro: 'ID inválido' })
  }

  try {
    await deletarContato(usuarioId, contatoId)
    return res.json({ mensagem: 'Contato deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar contato:', error)

    if (error.message === 'Contato não encontrado') {
      return res.status(404).json({ erro: error.message })
    }

    return res.status(500).json({ erro: 'Erro ao deletar contato' })
  }
}

module.exports = {
  handleListarContatos,
  handleBuscarContato,
  handleCriarContato,
  handleAtualizarContato,
  handleDeletarContato
}
