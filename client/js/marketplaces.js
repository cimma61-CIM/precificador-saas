const marketplacesComuns = [
  'Mercado Livre',
  'Shopee',
  'Amazon',
  'Magalu',
  'TikTok',
  'Shein',
  'Temu'
]

let marketplacesCache = []
let marketplaceEmEdicao = null
let buscaMarketplacesTimer = null
let slugFoiEditadoManualmente = false

function slugifyMarketplace(valor) {
  return String(valor || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

function setMarketplaceFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('marketplace-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function atualizarEstadoFormularioMarketplace() {
  document.getElementById('marketplace-form-title').textContent = marketplaceEmEdicao
    ? 'Editar marketplace'
    : 'Novo marketplace'
  document.getElementById('marketplace-submit-button').textContent = marketplaceEmEdicao
    ? 'Atualizar Marketplace'
    : 'Salvar Marketplace'
  document.getElementById('marketplace-cancel-button').classList.toggle('hidden', !marketplaceEmEdicao)
}

function renderMarketplaces() {
  const tabela = document.getElementById('marketplaces-tabela')
  tabela.innerHTML = ''

  if (!marketplacesCache.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4">Nenhum marketplace encontrado.</td>
      </tr>
    `
    return
  }

  marketplacesCache.forEach((marketplace) => {
    const status = marketplace.ativo
      ? '<span class="status-badge status-ok">Ativo</span>'
      : '<span class="status-badge status-warn">Inativo</span>'
    const botaoExcluir = marketplace.pode_excluir
      ? `<button type="button" class="button-danger" onclick="excluirMarketplace(${marketplace.id})">Excluir</button>`
      : ''

    tabela.innerHTML += `
      <tr>
        <td>${marketplace.nome}</td>
        <td>${marketplace.slug}</td>
        <td>${status}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="button-secondary" onclick="editarMarketplace(${marketplace.id})">Editar</button>
            ${
              marketplace.ativo
                ? `<button type="button" class="button-secondary" onclick="desativarMarketplace(${marketplace.id})">Desativar</button>`
                : `<span class="text-soft">Ja inativo</span>`
            }
            ${botaoExcluir}
          </div>
        </td>
      </tr>
    `
  })
}

async function loadMarketplaces() {
  try {
    const busca = document.getElementById('marketplace-busca').value.trim()
    const query = new URLSearchParams({
      include_inactive: 'true'
    })

    if (busca) {
      query.set('q', busca)
    }

    const dados = await apiFetch(`/marketplaces?${query.toString()}`, {
      method: 'GET'
    })

    marketplacesCache = dados.marketplaces || []
    renderMarketplaces()
  } catch (error) {
    setMarketplaceFeedback(error.message, 'text-danger')
  }
}

function limparFormularioMarketplace() {
  marketplaceEmEdicao = null
  slugFoiEditadoManualmente = false
  document.getElementById('marketplace-id').value = ''
  document.getElementById('marketplace-nome').value = ''
  document.getElementById('marketplace-slug').value = ''
  atualizarEstadoFormularioMarketplace()
}

function cancelarEdicaoMarketplace() {
  limparFormularioMarketplace()
  setMarketplaceFeedback('')
}

function editarMarketplace(id) {
  const marketplace = marketplacesCache.find((item) => item.id === Number(id))

  if (!marketplace) {
    setMarketplaceFeedback('Marketplace nao encontrado para edicao.', 'text-danger')
    return
  }

  marketplaceEmEdicao = marketplace.id
  slugFoiEditadoManualmente = true
  document.getElementById('marketplace-id').value = marketplace.id
  document.getElementById('marketplace-nome').value = marketplace.nome || ''
  document.getElementById('marketplace-slug').value = marketplace.slug || ''
  atualizarEstadoFormularioMarketplace()
  setMarketplaceFeedback('Modo de edicao ativado.', 'text-success')
}

async function salvarMarketplace() {
  const id = Number(document.getElementById('marketplace-id').value)
  const nome = document.getElementById('marketplace-nome').value.trim()
  const slug = slugifyMarketplace(document.getElementById('marketplace-slug').value)

  if (!nome) {
    setMarketplaceFeedback('Informe o nome do marketplace.', 'text-danger')
    return
  }

  if (!slug) {
    setMarketplaceFeedback('Informe um slug valido para o marketplace.', 'text-danger')
    return
  }

  try {
    await apiFetch(id ? `/marketplaces/${id}` : '/marketplaces', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({ nome, slug })
    })

    limparFormularioMarketplace()
    setMarketplaceFeedback(
      id ? 'Marketplace atualizado com sucesso.' : 'Marketplace salvo com sucesso.',
      'text-success'
    )
    await loadMarketplaces()
  } catch (error) {
    setMarketplaceFeedback(error.message, 'text-danger')
  }
}

async function desativarMarketplace(id) {
  const marketplace = marketplacesCache.find((item) => item.id === Number(id))

  if (!marketplace) {
    setMarketplaceFeedback('Marketplace nao encontrado para desativacao.', 'text-danger')
    return
  }

  const confirmou = window.confirm(
    `Desativar o marketplace "${marketplace.nome}"? Ele deixara de aparecer em produtos e taxas.`
  )

  if (!confirmou) {
    return
  }

  try {
    await apiFetch(`/marketplaces/${id}/deactivate`, {
      method: 'PATCH'
    })

    if (marketplaceEmEdicao === Number(id)) {
      limparFormularioMarketplace()
    }

    setMarketplaceFeedback('Marketplace desativado com sucesso.', 'text-success')
    await loadMarketplaces()
  } catch (error) {
    setMarketplaceFeedback(error.message, 'text-danger')
  }
}

async function excluirMarketplace(id) {
  const marketplace = marketplacesCache.find((item) => item.id === Number(id))

  if (!marketplace) {
    setMarketplaceFeedback('Marketplace nao encontrado para exclusao.', 'text-danger')
    return
  }

  const confirmou = window.confirm(
    `Excluir definitivamente o marketplace "${marketplace.nome}"? Essa acao nao pode ser desfeita.`
  )

  if (!confirmou) {
    return
  }

  try {
    await apiFetch(`/marketplaces/${id}`, {
      method: 'DELETE'
    })

    if (marketplaceEmEdicao === Number(id)) {
      limparFormularioMarketplace()
    }

    setMarketplaceFeedback('Marketplace excluido com sucesso.', 'text-success')
    await loadMarketplaces()
  } catch (error) {
    setMarketplaceFeedback(error.message, 'text-danger')
  }
}

function handleNomeMarketplaceInput(event) {
  const nome = event.target.value

  if (!slugFoiEditadoManualmente) {
    document.getElementById('marketplace-slug').value = slugifyMarketplace(nome)
  }

  const sugestoes = marketplacesComuns.filter((item) =>
    item.toLowerCase().includes(nome.trim().toLowerCase())
  )

  if (nome.trim().length >= 1 && sugestoes.length) {
    event.target.setAttribute('list', 'marketplace-sugestoes')
  }
}

function handleSlugMarketplaceInput() {
  slugFoiEditadoManualmente = true
  const slugInput = document.getElementById('marketplace-slug')
  slugInput.value = slugifyMarketplace(slugInput.value)
}

function handleBuscaMarketplacesInput() {
  if (buscaMarketplacesTimer) {
    clearTimeout(buscaMarketplacesTimer)
  }

  buscaMarketplacesTimer = window.setTimeout(() => {
    loadMarketplaces()
  }, 250)
}

document.getElementById('marketplace-form').addEventListener('submit', function (event) {
  event.preventDefault()
  salvarMarketplace()
})

document.getElementById('marketplace-nome').addEventListener('input', handleNomeMarketplaceInput)
document.getElementById('marketplace-slug').addEventListener('input', handleSlugMarketplaceInput)
document.getElementById('marketplace-busca').addEventListener('input', handleBuscaMarketplacesInput)

atualizarEstadoFormularioMarketplace()
loadMarketplaces()
