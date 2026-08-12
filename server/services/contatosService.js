const pool = require('../db')

function normalizarTexto(valor, campo) {
  const texto = String(valor || '').trim()

  if (!texto) {
    throw new Error(`${campo} é obrigatório`)
  }

  return texto
}

function normalizarTipo(valor) {
  const tipo = String(valor || '').trim().toLowerCase()

  const tiposValidos = ['cliente', 'fornecedor', 'ambos']

  if (!tiposValidos.includes(tipo)) {
    throw new Error('Tipo deve ser cliente, fornecedor ou ambos')
  }

  return tipo
}

function normalizarDocumento(valor) {
  if (!valor) {
    return null
  }

  return String(valor || '').trim()
}

function normalizarEmail(valor) {
  if (!valor) {
    return null
  }

  const email = String(valor || '').trim().toLowerCase()

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!regexEmail.test(email)) {
    throw new Error('Email inválido')
  }

  return email
}

function normalizarTelefone(valor) {
  if (!valor) {
    return null
  }

  return String(valor || '').trim()
}

function normalizarObservacoes(valor) {
  if (!valor) {
    return null
  }

  return String(valor || '').trim()
}

function selecionarColunasContato(alias = 'c') {
  return `
    ${alias}.id,
    ${alias}.nome,
    COALESCE(
      ${alias}.tipo,
      (
        SELECT CASE
          WHEN BOOL_OR(LOWER(tt.nome) = 'fornecedor')
            AND BOOL_OR(LOWER(tt.nome) = 'cliente') THEN 'ambos'
          WHEN BOOL_OR(LOWER(tt.nome) = 'fornecedor') THEN 'fornecedor'
          ELSE 'cliente'
        END
        FROM contato_tipos ct
        INNER JOIN tipos_contato tt ON tt.id = ct.tipo_id
        WHERE ct.contato_id = ${alias}.id
      ),
      'cliente'
    ) AS tipo,
    ${alias}.documento,
    ${alias}.telefone,
    ${alias}.email,
    ${alias}.observacoes,
    ${alias}.usuario_id,
    ${alias}.criado_em,
    ${alias}.atualizado_em
  `
}

// ✅ Listar contatos por usuário
async function listarContatos(usuarioId) {
  const result = await pool.query(
    `
    SELECT
      ${selecionarColunasContato('c')}
    FROM contatos c
    WHERE c.usuario_id = $1
    ORDER BY c.criado_em DESC
    `,
    [usuarioId]
  )

  return result.rows
}

// ✅ Buscar contato por ID
async function buscarContatoPorId(usuarioId, contatoId) {
  const result = await pool.query(
    `
    SELECT
      ${selecionarColunasContato('c')}
    FROM contatos c
    WHERE c.id = $1 AND c.usuario_id = $2
    LIMIT 1
    `,
    [contatoId, usuarioId]
  )

  return result.rows[0] || null
}

// ✅ Criar contato
async function criarContato(usuarioId, dados = {}) {
  try {
    // Validações obrigatórias
    const nome = normalizarTexto(dados.nome, 'Nome')
    const tipo = normalizarTipo(dados.tipo)

    // Validações opcionais
    const documento = normalizarDocumento(dados.documento)
    const telefone = normalizarTelefone(dados.telefone)
    const email = normalizarEmail(dados.email)
    const observacoes = normalizarObservacoes(dados.observacoes)

    const result = await pool.query(
      `
      INSERT INTO contatos (usuario_id, nome, tipo, documento, telefone, email, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nome, tipo, documento, telefone, email, observacoes, usuario_id, criado_em, atualizado_em
      `,
      [usuarioId, nome, tipo, documento, telefone, email, observacoes]
    )

    return result.rows[0]
  } catch (error) {
    throw error
  }
}

// ✅ Atualizar contato
async function atualizarContato(usuarioId, contatoId, dados = {}) {
  try {
    // Verificar se contato existe
    const contatoExistente = await buscarContatoPorId(usuarioId, contatoId)

    if (!contatoExistente) {
      throw new Error('Contato não encontrado')
    }

    // Preparar campos com valores atuais como fallback
    const nome = dados.nome ? normalizarTexto(dados.nome, 'Nome') : contatoExistente.nome
    const tipo = dados.tipo ? normalizarTipo(dados.tipo) : contatoExistente.tipo
    const documento = dados.documento !== undefined ? normalizarDocumento(dados.documento) : contatoExistente.documento
    const telefone = dados.telefone !== undefined ? normalizarTelefone(dados.telefone) : contatoExistente.telefone
    const email = dados.email !== undefined ? normalizarEmail(dados.email) : contatoExistente.email
    const observacoes = dados.observacoes !== undefined ? normalizarObservacoes(dados.observacoes) : contatoExistente.observacoes

    const result = await pool.query(
      `
      UPDATE contatos
      SET nome = $2, tipo = $3, documento = $4, telefone = $5, email = $6, observacoes = $7, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1 AND usuario_id = $8
      RETURNING id, nome, tipo, documento, telefone, email, observacoes, usuario_id, criado_em, atualizado_em
      `,
      [contatoId, nome, tipo, documento, telefone, email, observacoes, usuarioId]
    )

    if (result.rows.length === 0) {
      throw new Error('Contato não encontrado')
    }

    return result.rows[0]
  } catch (error) {
    throw error
  }
}

// ✅ Deletar contato
async function deletarContato(usuarioId, contatoId) {
  try {
    // Verificar se contato existe
    const contatoExistente = await buscarContatoPorId(usuarioId, contatoId)

    if (!contatoExistente) {
      throw new Error('Contato não encontrado')
    }

    await pool.query(
      'DELETE FROM contatos WHERE id = $1 AND usuario_id = $2',
      [contatoId, usuarioId]
    )

    return { mensagem: 'Contato deletado com sucesso' }
  } catch (error) {
    throw error
  }
}

module.exports = {
  listarContatos,
  buscarContatoPorId,
  criarContato,
  atualizarContato,
  deletarContato
}
