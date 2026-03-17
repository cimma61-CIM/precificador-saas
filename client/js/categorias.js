let categoriasCache = []
let categoriaBuscaTimer = null

function setCategoriasFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('categorias-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function normalizarCategoria(valor) {
  return String(valor || '').trim()
}

function formatarData(valor) {
  if (!valor) {
    return '<span class="text-soft">-</span>'
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '<span class="text-soft">-</span>'
  }

  return new Intl.DateTimeFormat('pt-BR').format(data)
}

function abrirFormularioCategoria() {
  document.getElementById('categoria-form').classList.remove('hidden')
  document.getElementById('categoria-nome').focus()
}

function fecharFormularioCategoria() {
  document.getElementById('categoria-form').classList.add('hidden')
  document.getElementById('categoria-nome').value = ''
}

function renderCategoriasTabela() {
  const tabela = document.getElementById('categorias-tabela')

  if (!categoriasCache.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="3">Nenhuma categoria encontrada.</td>
      </tr>
    `
    return
  }

  tabela.innerHTML = categoriasCache
    .map(
      (categoria) => `
        <tr>
          <td>${categoria.nome}</td>
          <td>${formatarData(categoria.created_at)}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="button-danger" onclick="excluirCategoria(${categoria.id})">Excluir</button>
            </div>
          </td>
        </tr>
      `
    )
    .join('')
}

async function carregarCategorias() {
  try {
    const busca = document.getElementById('categorias-busca').value.trim()
    const params = new URLSearchParams({ page: '1', limit: '200', include_inactive: 'true' })

    if (busca) {
      params.set('busca', busca)
    }

    const dados = await apiFetch(`/categorias?${params.toString()}`)
    categoriasCache = (dados.categorias || []).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
    renderCategoriasTabela()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

window.excluirCategoria = async function excluirCategoria(id) {
  const confirmou = window.confirm('Deseja realmente excluir esta categoria?')

  if (!confirmou) {
    return
  }

  try {
    await apiFetch(`/categorias/${id}`, {
      method: 'DELETE'
    })

    setCategoriasFeedback('Categoria excluida com sucesso.', 'text-success')
    await carregarCategorias()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

async function salvarCategoria(event) {
  event.preventDefault()

  const nome = normalizarCategoria(document.getElementById('categoria-nome').value)

  if (!nome) {
    setCategoriasFeedback('Nome da categoria e obrigatorio.', 'text-danger')
    return
  }

  try {
    await apiFetch('/categorias', {
      method: 'POST',
      body: JSON.stringify({ nome })
    })

    setCategoriasFeedback('Categoria criada com sucesso.', 'text-success')
    fecharFormularioCategoria()
    await carregarCategorias()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

async function initCategorias() {
  try {
    await carregarCategorias()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

document.getElementById('categoria-form').addEventListener('submit', salvarCategoria)
document.getElementById('nova-categoria-toggle').addEventListener('click', () => {
  abrirFormularioCategoria()
  setCategoriasFeedback('')
})
document.getElementById('categoria-cancelar-button').addEventListener('click', () => {
  fecharFormularioCategoria()
  setCategoriasFeedback('')
})
document.getElementById('categorias-atualizar-button').addEventListener('click', carregarCategorias)
document.getElementById('categorias-busca').addEventListener('input', function () {
  if (categoriaBuscaTimer) {
    clearTimeout(categoriaBuscaTimer)
  }

  categoriaBuscaTimer = window.setTimeout(() => {
    carregarCategorias()
  }, 250)
})

document.addEventListener('DOMContentLoaded', initCategorias)
