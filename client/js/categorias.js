let categoriasCache = []
let marketplacesCache = []
let categoriaBuscaTimer = null

function setCategoriasFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('categorias-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function slugifyCategoria(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function resetCategoriaForm() {
  document.getElementById('categoria-id').value = ''
  document.getElementById('categoria-nome').value = ''
  document.getElementById('categoria-slug').value = ''
  document.getElementById('categoria-tipo-canal').value = 'loja_virtual'
  document.getElementById('categoria-marketplace-id').value = ''
  document.getElementById('categoria-ativa').value = 'true'
  document.getElementById('categoria-descricao').value = ''
  document.getElementById('categoria-form-titulo').textContent = 'Nova categoria'
  document.getElementById('categoria-submit-button').textContent = 'Salvar categoria'
  document.getElementById('categoria-cancelar-button').classList.add('hidden')
  atualizarCampoMarketplaceCategoria()
}

function atualizarCampoMarketplaceCategoria() {
  const tipoCanal = document.getElementById('categoria-tipo-canal').value
  const field = document.getElementById('categoria-marketplace-field')
  const select = document.getElementById('categoria-marketplace-id')
  const obrigatorio = tipoCanal === 'marketplace'

  field.classList.toggle('hidden', !obrigatorio)
  select.required = obrigatorio

  if (!obrigatorio) {
    select.value = ''
  }
}

function preencherFiltrosMarketplaces() {
  preencherSelectMarketplaces(
    document.getElementById('categoria-marketplace-id'),
    marketplacesCache,
    'Selecione um marketplace'
  )

  preencherSelectMarketplaces(
    document.getElementById('categorias-filtro-marketplace'),
    marketplacesCache,
    'Todos os marketplaces'
  )
}

function formatarTipoCanal(tipoCanal) {
  if (tipoCanal === 'marketplace') {
    return 'Marketplace'
  }

  if (tipoCanal === 'venda_direta') {
    return 'Venda direta'
  }

  return 'Loja virtual'
}

function renderCategoriasTabela() {
  const tabela = document.getElementById('categorias-tabela')

  if (!categoriasCache.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="6">Nenhuma categoria encontrada.</td>
      </tr>
    `
    return
  }

  tabela.innerHTML = categoriasCache
    .map(
      (categoria, index) => `
        <tr>
          <td>${categoria.nome}</td>
          <td>${categoria.slug}</td>
          <td>${formatarTipoCanal(categoria.tipo_canal)}</td>
          <td>${categoria.marketplace_nome || '<span class="text-soft">Canal proprio</span>'}</td>
          <td>${categoria.ativa ? '<span class="pill">Ativa</span>' : '<span class="text-soft">Inativa</span>'}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="button-secondary" onclick="editarCategoria(${index})">Editar</button>
              <button type="button" class="button-secondary" onclick="alternarCategoria(${categoria.id}, ${categoria.ativa ? 'false' : 'true'})">
                ${categoria.ativa ? 'Desativar' : 'Reativar'}
              </button>
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
    const tipoCanal = document.getElementById('categorias-filtro-tipo').value
    const marketplaceId = document.getElementById('categorias-filtro-marketplace').value
    const params = new URLSearchParams({
      page: '1',
      limit: '200',
      include_inactive: 'true'
    })

    if (busca) {
      params.set('busca', busca)
    }

    if (tipoCanal) {
      params.set('tipo_canal', tipoCanal)
    }

    if (marketplaceId) {
      params.set('marketplace_id', marketplaceId)
    }

    const dados = await apiFetch(`/categorias?${params.toString()}`)
    categoriasCache = dados.categorias || []
    renderCategoriasTabela()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

function preencherCategoriaForm(categoria) {
  document.getElementById('categoria-id').value = categoria.id
  document.getElementById('categoria-nome').value = categoria.nome || ''
  document.getElementById('categoria-slug').value = categoria.slug || ''
  document.getElementById('categoria-tipo-canal').value = categoria.tipo_canal || 'loja_virtual'
  atualizarCampoMarketplaceCategoria()
  document.getElementById('categoria-marketplace-id').value = categoria.marketplace_id || ''
  document.getElementById('categoria-ativa').value = categoria.ativa ? 'true' : 'false'
  document.getElementById('categoria-descricao').value = categoria.descricao || ''
  document.getElementById('categoria-form-titulo').textContent = 'Editar categoria'
  document.getElementById('categoria-submit-button').textContent = 'Atualizar categoria'
  document.getElementById('categoria-cancelar-button').classList.remove('hidden')
}

window.editarCategoria = function editarCategoria(index) {
  const categoria = categoriasCache[index]

  if (!categoria) {
    return
  }

  preencherCategoriaForm(categoria)
  setCategoriasFeedback('')
}

window.alternarCategoria = async function alternarCategoria(id, ativa) {
  const categoria = categoriasCache.find((item) => Number(item.id) === Number(id))

  if (!categoria) {
    return
  }

  try {
    await apiFetch(`/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome: categoria.nome,
        slug: categoria.slug,
        descricao: categoria.descricao || '',
        tipo_canal: categoria.tipo_canal,
        marketplace_id: categoria.marketplace_id,
        ativa
      })
    })

    setCategoriasFeedback('Categoria atualizada com sucesso.', 'text-success')
    await carregarCategorias()
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
    await apiFetch(`/categorias/${id}?hard=true`, {
      method: 'DELETE'
    })

    setCategoriasFeedback('Categoria excluida com sucesso.', 'text-success')
    await carregarCategorias()
    resetCategoriaForm()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

async function salvarCategoria(event) {
  event.preventDefault()

  const categoriaId = document.getElementById('categoria-id').value
  const payload = {
    nome: document.getElementById('categoria-nome').value.trim(),
    slug: document.getElementById('categoria-slug').value.trim() || slugifyCategoria(document.getElementById('categoria-nome').value),
    descricao: document.getElementById('categoria-descricao').value.trim(),
    tipo_canal: document.getElementById('categoria-tipo-canal').value,
    marketplace_id: document.getElementById('categoria-marketplace-id').value || null,
    ativa: document.getElementById('categoria-ativa').value === 'true'
  }

  try {
    await apiFetch(categoriaId ? `/categorias/${categoriaId}` : '/categorias', {
      method: categoriaId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    })

    setCategoriasFeedback(
      categoriaId ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.',
      'text-success'
    )
    resetCategoriaForm()
    await carregarCategorias()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

async function initCategorias() {
  try {
    marketplacesCache = await carregarMarketplacesAtivos()
    preencherFiltrosMarketplaces()
    atualizarCampoMarketplaceCategoria()
    await carregarCategorias()
  } catch (error) {
    setCategoriasFeedback(error.message, 'text-danger')
  }
}

document.getElementById('categoria-form').addEventListener('submit', salvarCategoria)
document.getElementById('categoria-tipo-canal').addEventListener('change', atualizarCampoMarketplaceCategoria)
document.getElementById('categoria-cancelar-button').addEventListener('click', () => {
  resetCategoriaForm()
  setCategoriasFeedback('')
})
document.getElementById('categorias-atualizar-button').addEventListener('click', carregarCategorias)
document.getElementById('categorias-filtro-tipo').addEventListener('change', carregarCategorias)
document.getElementById('categorias-filtro-marketplace').addEventListener('change', carregarCategorias)
document.getElementById('categorias-busca').addEventListener('input', function () {
  if (categoriaBuscaTimer) {
    clearTimeout(categoriaBuscaTimer)
  }

  categoriaBuscaTimer = window.setTimeout(() => {
    carregarCategorias()
  }, 250)
})
document.getElementById('categoria-nome').addEventListener('input', function () {
  const slugInput = document.getElementById('categoria-slug')

  if (!slugInput.value.trim()) {
    slugInput.value = slugifyCategoria(this.value)
  }
})

document.addEventListener('DOMContentLoaded', initCategorias)
