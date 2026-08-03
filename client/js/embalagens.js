let embalagensCache = []
let embalagemEditando = null
let paginaAtual = 1
let totalEmbalagens = 0
const limiteEmbalagens = 25
let buscaTimeout = null

function escapeHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function debounce(fn, delay = 250) {
  return (...args) => {
    clearTimeout(buscaTimeout)
    buscaTimeout = setTimeout(() => fn(...args), delay)
  }
}

function setEmbalagensFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('embalagens-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem

  if (!mensagem) {
    return
  }

  setTimeout(() => {
    feedback.textContent = ''
    feedback.className = 'feedback'
  }, 5000)
}

function atualizarPaginacao() {
  const paginacao = document.getElementById('embalagens-paginacao')
  const totalPaginas = Math.max(Math.ceil(totalEmbalagens / limiteEmbalagens), 1)

  if (totalPaginas <= 1) {
    paginacao.innerHTML = ''
    return
  }

  paginacao.innerHTML = `
    <div class="pagination-controls">
      <button type="button" class="button-secondary" id="embalagens-anterior-button" ${paginaAtual <= 1 ? 'disabled' : ''}>Anterior</button>
      <span>Pagina ${paginaAtual} de ${totalPaginas}</span>
      <button type="button" class="button-secondary" id="embalagens-proxima-button" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>Proxima</button>
    </div>
  `

  document.getElementById('embalagens-anterior-button')?.addEventListener('click', () => {
    if (paginaAtual > 1) {
      carregarEmbalagens(paginaAtual - 1)
    }
  })

  document.getElementById('embalagens-proxima-button')?.addEventListener('click', () => {
    const totalPaginasLocal = Math.max(Math.ceil(totalEmbalagens / limiteEmbalagens), 1)
    if (paginaAtual < totalPaginasLocal) {
      carregarEmbalagens(paginaAtual + 1)
    }
  })
}

function renderEmbalagensTabela() {
  const tabela = document.getElementById('embalagens-tabela')

  if (!embalagensCache.length) {
    tabela.innerHTML = '<tr><td colspan="6">Nenhuma embalagem encontrada.</td></tr>'
    return
  }

  tabela.innerHTML = embalagensCache
    .map((embalagem) => `
      <tr>
        <td>${escapeHtml(embalagem.nome)}</td>
        <td>${escapeHtml(String(embalagem.peso_kg || '-'))}</td>
        <td>${escapeHtml(String(embalagem.largura_cm || '-'))} x ${escapeHtml(String(embalagem.altura_cm || '-'))} x ${escapeHtml(String(embalagem.comprimento_cm || '-'))}</td>
        <td>${escapeHtml(String(embalagem.volume_cm3 || '-'))}</td>
        <td>${embalagem.ativo ? 'Ativo' : 'Inativo'}</td>
        <td>
          <button type="button" class="button-secondary" onclick="editarEmbalagem(${embalagem.id})">Editar</button>
          <button type="button" class="button-secondary" onclick="excluirEmbalagem(${embalagem.id})">Excluir</button>
        </td>
      </tr>
    `)
    .join('')
}

async function carregarEmbalagens(pagina = 1) {
  try {
    setEmbalagensFeedback('Carregando embalagens...')
    const busca = document.getElementById('embalagens-busca').value.trim()
    const includeInactive = document.getElementById('embalagens-include-inativos').checked
    const params = new URLSearchParams()
    params.set('page', String(pagina))
    params.set('limit', String(limiteEmbalagens))

    if (busca) {
      params.set('q', busca)
    }

    if (includeInactive) {
      params.set('include_inactive', 'true')
    }

    const dados = await apiFetch(`/embalagens?${params.toString()}`)
    embalagensCache = Array.isArray(dados.embalagens) ? dados.embalagens : []
    totalEmbalagens = Number(dados.total || 0)
    paginaAtual = Number(dados.page || pagina)

    renderEmbalagensTabela()
    atualizarPaginacao()
    setEmbalagensFeedback('Embalagens carregadas com sucesso.', 'success')
  } catch (error) {
    console.error('Erro ao carregar embalagens:', error)
    setEmbalagensFeedback(`Erro ao carregar embalagens: ${error.message}`, 'error')
  }
}

function abrirFormulario(embalagem = null) {
  const form = document.getElementById('embalagem-form')

  embalagemEditando = embalagem
  form.classList.remove('hidden')

  if (embalagem) {
    document.getElementById('embalagem-id').value = embalagem.id
    document.getElementById('embalagem-nome').value = embalagem.nome || ''
    document.getElementById('embalagem-peso').value = embalagem.peso_kg || ''
    document.getElementById('embalagem-largura').value = embalagem.largura_cm || ''
    document.getElementById('embalagem-altura').value = embalagem.altura_cm || ''
    document.getElementById('embalagem-comprimento').value = embalagem.comprimento_cm || ''
    document.getElementById('embalagem-ativo').checked = embalagem.ativo === true
  } else {
    document.getElementById('embalagem-id').value = ''
    document.getElementById('embalagem-nome').value = ''
    document.getElementById('embalagem-peso').value = ''
    document.getElementById('embalagem-largura').value = ''
    document.getElementById('embalagem-altura').value = ''
    document.getElementById('embalagem-comprimento').value = ''
    document.getElementById('embalagem-ativo').checked = true
  }
}

function fecharFormulario() {
  const form = document.getElementById('embalagem-form')
  form.classList.add('hidden')
  embalagemEditando = null
}

async function salvarEmbalagem(event) {
  event.preventDefault()

  const embalagemId = Number(document.getElementById('embalagem-id').value)
  const dados = {
    nome: document.getElementById('embalagem-nome').value.trim(),
    peso_kg: document.getElementById('embalagem-peso').value.trim(),
    largura_cm: document.getElementById('embalagem-largura').value.trim(),
    altura_cm: document.getElementById('embalagem-altura').value.trim(),
    comprimento_cm: document.getElementById('embalagem-comprimento').value.trim(),
    ativo: document.getElementById('embalagem-ativo').checked
  }

  if (!dados.nome) {
    setEmbalagensFeedback('Nome da embalagem e obrigatorio.', 'error')
    return
  }

  if (!dados.peso_kg || Number(dados.peso_kg) <= 0) {
    setEmbalagensFeedback('Peso em kg deve ser maior que zero.', 'error')
    return
  }

  if (!dados.largura_cm || Number(dados.largura_cm) <= 0) {
    setEmbalagensFeedback('Largura em cm deve ser maior que zero.', 'error')
    return
  }

  if (!dados.altura_cm || Number(dados.altura_cm) <= 0) {
    setEmbalagensFeedback('Altura em cm deve ser maior que zero.', 'error')
    return
  }

  if (!dados.comprimento_cm || Number(dados.comprimento_cm) <= 0) {
    setEmbalagensFeedback('Comprimento em cm deve ser maior que zero.', 'error')
    return
  }

  try {
    if (embalagemEditando) {
      await apiFetch(`/embalagens/${embalagemId}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
      })
      setEmbalagensFeedback('Embalagem atualizada com sucesso.', 'success')
    } else {
      await apiFetch('/embalagens', {
        method: 'POST',
        body: JSON.stringify(dados)
      })
      setEmbalagensFeedback('Embalagem criada com sucesso.', 'success')
    }

    fecharFormulario()
    await carregarEmbalagens(paginaAtual)
  } catch (error) {
    console.error('Erro ao salvar embalagem:', error)
    setEmbalagensFeedback(`Erro ao salvar embalagem: ${error.message}`, 'error')
  }
}

async function excluirEmbalagem(id) {
  if (!confirm('Tem certeza que deseja excluir esta embalagem?')) {
    return
  }

  try {
    await apiFetch(`/embalagens/${id}`, {
      method: 'DELETE'
    })
    setEmbalagensFeedback('Embalagem excluida com sucesso.', 'success')
    await carregarEmbalagens(paginaAtual)
  } catch (error) {
    console.error('Erro ao excluir embalagem:', error)
    setEmbalagensFeedback(`Erro ao excluir embalagem: ${error.message}`, 'error')
  }
}

window.editarEmbalagem = function (id) {
  const embalagem = embalagensCache.find((item) => Number(item.id) === Number(id))
  if (embalagem) {
    abrirFormulario(embalagem)
  }
}

window.excluirEmbalagem = excluirEmbalagem

document.addEventListener('DOMContentLoaded', () => {
  carregarEmbalagens()

  document.getElementById('nova-embalagem-button').addEventListener('click', () => abrirFormulario())
  document.getElementById('embalagem-cancelar-button').addEventListener('click', fecharFormulario)
  document.getElementById('embalagem-form').addEventListener('submit', salvarEmbalagem)
  document.getElementById('embalagens-atualizar-button').addEventListener('click', () => carregarEmbalagens(1))
  document.getElementById('embalagens-include-inativos').addEventListener('change', () => carregarEmbalagens(1))
  document.getElementById('embalagens-busca').addEventListener('input', debounce(() => carregarEmbalagens(1)))
})
