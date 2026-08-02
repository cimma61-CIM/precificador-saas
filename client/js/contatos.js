let contatos = []
let contatoEditando = null

function setFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('contatos-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
  setTimeout(() => {
    feedback.textContent = ''
    feedback.className = 'feedback'
  }, 5000)
}

function filtrarContatos() {
  const busca = document.getElementById('busca-contato').value.toLowerCase()
  const filtroTipo = document.getElementById('filtro-tipo').value

  return contatos.filter(contato => {
    const matchBusca = !busca || contato.nome.toLowerCase().includes(busca)
    const matchTipo = !filtroTipo || contato.tipo === filtroTipo
    return matchBusca && matchTipo
  })
}

function renderContatos() {
  const tabela = document.getElementById('tabela-contatos')
  const contatosFiltrados = filtrarContatos()

  if (contatosFiltrados.length === 0) {
    tabela.innerHTML = '<tr><td colspan="5">Nenhum contato encontrado</td></tr>'
    return
  }

  tabela.innerHTML = contatosFiltrados.map(contato => `
    <tr>
      <td>${contato.nome}</td>
      <td>${contato.tipo}</td>
      <td>${contato.documento || '-'}</td>
      <td>${contato.telefone || '-'}</td>
      <td>
        <button onclick="editarContato(${contato.id})" class="button-secondary">Editar</button>
        <button onclick="excluirContato(${contato.id})" class="button-secondary">Excluir</button>
      </td>
    </tr>
  `).join('')
}

async function carregarContatos() {
  try {
    setFeedback('Carregando contatos...')
    contatos = await apiFetch('/contatos')
    renderContatos()
    setFeedback('Contatos carregados com sucesso', 'success')
  } catch (error) {
    console.error('Erro ao carregar contatos:', error)
    setFeedback(`Erro ao carregar contatos: ${error.message}`, 'error')
  }
}

function abrirModal(contato = null) {
  contatoEditando = contato
  const modal = document.getElementById('modal-contato')
  const titulo = document.getElementById('modal-titulo')
  const form = document.getElementById('form-contato')

  if (contato) {
    titulo.textContent = 'Editar Contato'
    document.getElementById('contato-id').value = contato.id
    document.getElementById('nome').value = contato.nome
    document.getElementById('tipo').value = contato.tipo
    document.getElementById('documento').value = contato.documento || ''
    document.getElementById('telefone').value = contato.telefone || ''
    document.getElementById('email').value = contato.email || ''
    document.getElementById('observacoes').value = contato.observacoes || ''
  } else {
    titulo.textContent = 'Novo Contato'
    form.reset()
    document.getElementById('contato-id').value = ''
  }

  modal.classList.add('show')
}

function fecharModal() {
  const modal = document.getElementById('modal-contato')
  modal.classList.remove('show')
  contatoEditando = null
}

async function salvarContato(event) {
  event.preventDefault()

  const dados = {
    nome: document.getElementById('nome').value.trim(),
    tipo: document.getElementById('tipo').value,
    documento: document.getElementById('documento').value.trim() || null,
    telefone: document.getElementById('telefone').value.trim() || null,
    email: document.getElementById('email').value.trim() || null,
    observacoes: document.getElementById('observacoes').value.trim() || null
  }

  try {
    if (contatoEditando) {
      await apiFetch(`/contatos/${contatoEditando.id}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
      })
      setFeedback('Contato atualizado com sucesso', 'success')
    } else {
      await apiFetch('/contatos', {
        method: 'POST',
        body: JSON.stringify(dados)
      })
      setFeedback('Contato criado com sucesso', 'success')
    }

    fecharModal()
    await carregarContatos()
  } catch (error) {
    console.error('Erro ao salvar contato:', error)
    setFeedback(`Erro ao salvar contato: ${error.message}`, 'error')
  }
}

async function excluirContato(id) {
  if (!confirm('Tem certeza que deseja excluir este contato?')) {
    return
  }

  try {
    await apiFetch(`/contatos/${id}`, {
      method: 'DELETE'
    })
    setFeedback('Contato excluído com sucesso', 'success')
    await carregarContatos()
  } catch (error) {
    console.error('Erro ao excluir contato:', error)
    setFeedback(`Erro ao excluir contato: ${error.message}`, 'error')
  }
}

window.editarContato = function(id) {
  const contato = contatos.find(c => c.id === id)
  if (contato) {
    abrirModal(contato)
  }
}

window.excluirContato = excluirContato

document.addEventListener('DOMContentLoaded', () => {
  carregarContatos()

  document.getElementById('novo-contato-btn').addEventListener('click', () => abrirModal())
  document.getElementById('modal-close').addEventListener('click', fecharModal)
  document.getElementById('cancelar-btn').addEventListener('click', fecharModal)
  document.getElementById('form-contato').addEventListener('submit', salvarContato)

  document.getElementById('busca-contato').addEventListener('input', renderContatos)
  document.getElementById('filtro-tipo').addEventListener('change', renderContatos)

  // Fechar modal ao clicar fora
  document.getElementById('modal-contato').addEventListener('click', (e) => {
    if (e.target.id === 'modal-contato') {
      fecharModal()
    }
  })
})