let vendedoresCache = []
let vendedorEditando = null
let paginaAtual = 1
let totalVendedores = 0
const limiteVendedores = 25
let buscaTimeout = null

function debounce(fn, delay = 300) {
  return (...args) => {
    clearTimeout(buscaTimeout)
    buscaTimeout = setTimeout(() => fn(...args), delay)
  }
}

function escapeHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function setVendedoresFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('vendedores-feedback')
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
  const paginacao = document.getElementById('vendedores-paginacao')
  const totalPaginas = Math.max(Math.ceil(totalVendedores / limiteVendedores), 1)

  if (totalPaginas <= 1) {
    paginacao.innerHTML = ''
    return
  }

  paginacao.innerHTML = `
    <div class="pagination-controls">
      <button type="button" class="button-secondary" id="vendedores-anterior-button" ${paginaAtual <= 1 ? 'disabled' : ''}>Anterior</button>
      <span>Pagina ${paginaAtual} de ${totalPaginas}</span>
      <button type="button" class="button-secondary" id="vendedores-proxima-button" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>Proxima</button>
    </div>
  `

  document.getElementById('vendedores-anterior-button')?.addEventListener('click', () => {
    if (paginaAtual > 1) {
      carregarVendedores(paginaAtual - 1)
    }
  })

  document.getElementById('vendedores-proxima-button')?.addEventListener('click', () => {
    const totalPaginasLocal = Math.max(Math.ceil(totalVendedores / limiteVendedores), 1)
    if (paginaAtual < totalPaginasLocal) {
      carregarVendedores(paginaAtual + 1)
    }
  })
}

function renderVendedoresTabela() {
  const tabela = document.getElementById('vendedores-tabela')

  if (!vendedoresCache.length) {
    tabela.innerHTML = '<tr><td colspan="5">Nenhum vendedor encontrado.</td></tr>'
    return
  }

  tabela.innerHTML = vendedoresCache
    .map((vendedor) => `
      <tr>
        <td>${escapeHtml(vendedor.nome)}</td>
        <td>${escapeHtml(vendedor.email || '-')}</td>
        <td>${escapeHtml(vendedor.telefone || '-')}</td>
        <td>${vendedor.ativo ? 'Ativo' : 'Inativo'}</td>
        <td>
          <button type="button" class="button-secondary" onclick="editarVendedor(${vendedor.id})">Editar</button>
          <button type="button" class="button-secondary" onclick="excluirVendedor(${vendedor.id})">Excluir</button>
        </td>
      </tr>
    `)
    .join('')
}

async function carregarVendedores(pagina = 1) {
  try {
    setVendedoresFeedback('Carregando vendedores...')
    const busca = document.getElementById('vendedores-busca').value.trim()
    const includeInactive = document.getElementById('vendedores-include-inativos').checked
    const params = new URLSearchParams()
    params.set('page', String(pagina))
    params.set('limit', String(limiteVendedores))

    if (busca) {
      params.set('q', busca)
    }

    if (includeInactive) {
      params.set('include_inactive', 'true')
    }

    const dados = await apiFetch(`/vendedores?${params.toString()}`)
    vendedoresCache = Array.isArray(dados.vendedores) ? dados.vendedores : []
    totalVendedores = Number(dados.total || 0)
    paginaAtual = Number(dados.page || pagina)

    renderVendedoresTabela()
    atualizarPaginacao()
    setVendedoresFeedback('Vendedores carregados com sucesso.', 'success')
  } catch (error) {
    console.error('Erro ao carregar vendedores:', error)
    setVendedoresFeedback(`Erro ao carregar vendedores: ${error.message}`, 'error')
  }
}

function abrirFormulario(vendedor = null) {
  const form = document.getElementById('vendedor-form')

  vendedorEditando = vendedor
  form.classList.remove('hidden')

  if (vendedor) {
    document.getElementById('vendedor-id').value = vendedor.id
    document.getElementById('vendedor-nome').value = vendedor.nome || ''
    document.getElementById('vendedor-email').value = vendedor.email || ''
    document.getElementById('vendedor-telefone').value = vendedor.telefone || ''
    document.getElementById('vendedor-ativo').checked = vendedor.ativo === true
  } else {
    document.getElementById('vendedor-id').value = ''
    document.getElementById('vendedor-nome').value = ''
    document.getElementById('vendedor-email').value = ''
    document.getElementById('vendedor-telefone').value = ''
    document.getElementById('vendedor-ativo').checked = true
  }
}

function fecharFormulario() {
  const form = document.getElementById('vendedor-form')
  form.classList.add('hidden')
  vendedorEditando = null
}

async function salvarVendedor(event) {
  event.preventDefault()

  const vendedorId = Number(document.getElementById('vendedor-id').value)
  const dados = {
    nome: document.getElementById('vendedor-nome').value.trim(),
    email: document.getElementById('vendedor-email').value.trim() || null,
    telefone: document.getElementById('vendedor-telefone').value.trim() || null,
    ativo: document.getElementById('vendedor-ativo').checked
  }

  if (!dados.nome) {
    setVendedoresFeedback('Nome do vendedor e obrigatorio.', 'error')
    return
  }

  try {
    if (vendedorEditando) {
      await apiFetch(`/vendedores/${vendedorId}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
      })
      setVendedoresFeedback('Vendedor atualizado com sucesso.', 'success')
    } else {
      await apiFetch('/vendedores', {
        method: 'POST',
        body: JSON.stringify(dados)
      })
      setVendedoresFeedback('Vendedor criado com sucesso.', 'success')
    }

    fecharFormulario()
    await carregarVendedores(paginaAtual)
  } catch (error) {
    console.error('Erro ao salvar vendedor:', error)
    setVendedoresFeedback(`Erro ao salvar vendedor: ${error.message}`, 'error')
  }
}

async function excluirVendedor(id) {
  if (!confirm('Tem certeza que deseja excluir este vendedor?')) {
    return
  }

  try {
    await apiFetch(`/vendedores/${id}`, {
      method: 'DELETE'
    })
    setVendedoresFeedback('Vendedor excluido com sucesso.', 'success')
    await carregarVendedores(paginaAtual)
  } catch (error) {
    console.error('Erro ao excluir vendedor:', error)
    setVendedoresFeedback(`Erro ao excluir vendedor: ${error.message}`, 'error')
  }
}

window.editarVendedor = function (id) {
  const vendedor = vendedoresCache.find((item) => Number(item.id) === Number(id))
  if (vendedor) {
    abrirFormulario(vendedor)
  }
}

window.excluirVendedor = excluirVendedor

document.addEventListener('DOMContentLoaded', () => {
  carregarVendedores()

  document.getElementById('novo-vendedor-button').addEventListener('click', () => abrirFormulario())
  document.getElementById('vendedor-cancelar-button').addEventListener('click', fecharFormulario)
  document.getElementById('vendedor-form').addEventListener('submit', salvarVendedor)
  document.getElementById('vendedores-atualizar-button').addEventListener('click', () => carregarVendedores(1))
  document.getElementById('vendedores-include-inativos').addEventListener('change', () => carregarVendedores(1))
  document.getElementById('vendedores-busca').addEventListener('input', debounce(() => carregarVendedores(1), 250))
})
