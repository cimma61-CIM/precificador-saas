let anunciosCache = []
let anuncioEditando = null
let paginaAtual = 1
let totalAnuncios = 0
const limiteAnuncios = 25
let buscaTimeout = null

function debounce(fn, delay = 250) {
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

function setAnunciosFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('anuncios-feedback')
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
  const paginacao = document.getElementById('anuncios-paginacao')
  const totalPaginas = Math.max(Math.ceil(totalAnuncios / limiteAnuncios), 1)

  if (totalPaginas <= 1) {
    paginacao.innerHTML = ''
    return
  }

  paginacao.innerHTML = `
    <div class="pagination-controls">
      <button type="button" class="button-secondary" id="anuncios-anterior-button" ${paginaAtual <= 1 ? 'disabled' : ''}>Anterior</button>
      <span>Pagina ${paginaAtual} de ${totalPaginas}</span>
      <button type="button" class="button-secondary" id="anuncios-proxima-button" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>Proxima</button>
    </div>
  `

  document.getElementById('anuncios-anterior-button')?.addEventListener('click', () => {
    if (paginaAtual > 1) {
      carregarAnuncios(paginaAtual - 1)
    }
  })

  document.getElementById('anuncios-proxima-button')?.addEventListener('click', () => {
    const totalPaginasLocal = Math.max(Math.ceil(totalAnuncios / limiteAnuncios), 1)
    if (paginaAtual < totalPaginasLocal) {
      carregarAnuncios(paginaAtual + 1)
    }
  })
}

function renderAnunciosTabela() {
  const tabela = document.getElementById('anuncios-tabela')

  if (!anunciosCache.length) {
    tabela.innerHTML = '<tr><td colspan="10">Nenhum anúncio encontrado.</td></tr>'
    return
  }

  tabela.innerHTML = anunciosCache
    .map((anuncio) => `
      <tr>
        <td>${escapeHtml(anuncio.produto_nome || anuncio.produto_sku || '-')}</td>
        <td>${escapeHtml(anuncio.marketplace_nome || '-')}</td>
        <td>${escapeHtml(anuncio.sku_anuncio)}</td>
        <td>R$ ${Number(anuncio.preco ?? 0).toFixed(2)}</td>
        <td>${escapeHtml(anuncio.estoque)}</td>
        <td>${escapeHtml(anuncio.status)}</td>
        <td>${anuncio.tem_ads ? 'Sim' : 'Não'}</td>
        <td>${anuncio.full ? 'Sim' : 'Não'}</td>
        <td>${anuncio.em_promocao ? 'Sim' : 'Não'}</td>
        <td>
          <button type="button" class="button-secondary" onclick="editarAnuncio(${anuncio.id})">Editar</button>
          <button type="button" class="button-secondary" onclick="excluirAnuncio(${anuncio.id})">Excluir</button>
        </td>
      </tr>
    `)
    .join('')
}

async function carregarAnuncios(pagina = 1) {
  try {
    setAnunciosFeedback('Carregando anúncios...')
    const busca = document.getElementById('anuncios-busca').value.trim()
    const filtroStatus = document.getElementById('anuncios-filtro-status').value
    const filtroMarketplace = document.getElementById('anuncios-filtro-marketplace').value
    const params = new URLSearchParams()
    params.set('page', String(pagina))
    params.set('limit', String(limiteAnuncios))

    if (busca) {
      params.set('q', busca)
    }

    if (filtroStatus) {
      params.set('status', filtroStatus)
    }

    if (filtroMarketplace) {
      params.set('marketplace_id', filtroMarketplace)
    }

    const dados = await apiFetch(`/anuncios?${params.toString()}`)
    anunciosCache = Array.isArray(dados.anuncios) ? dados.anuncios : []
    totalAnuncios = Number(dados.total || 0)
    paginaAtual = Number(dados.page || pagina)

    renderAnunciosTabela()
    atualizarPaginacao()
    setAnunciosFeedback('Anúncios carregados com sucesso.', 'success')
  } catch (error) {
    console.error('Erro ao carregar anúncios:', error)
    setAnunciosFeedback(`Erro ao carregar anúncios: ${error.message}`, 'error')
  }
}

function preencherSelectProdutos(select, produtos) {
  select.innerHTML = '<option value="">Selecione um produto</option>' +
    produtos.map((produto) => `
      <option value="${produto.id}">${escapeHtml(produto.nome || produto.sku)}</option>
    `).join('')
}

function preencherSelectMarketplaces(select, marketplaces, placeholder) {
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
    marketplaces.map((marketplace) => `
      <option value="${marketplace.id}">${escapeHtml(marketplace.nome)}</option>
    `).join('')
}

function abrirFormulario(anuncio = null) {
  const form = document.getElementById('anuncio-form')
  anuncioEditando = anuncio
  form.classList.remove('hidden')

  if (anuncio) {
    document.getElementById('anuncio-id').value = anuncio.id
    document.getElementById('anuncio-produto').value = anuncio.produto_id || ''
    document.getElementById('anuncio-marketplace').value = anuncio.marketplace_id || ''
    document.getElementById('anuncio-sku').value = anuncio.sku_anuncio || ''
    document.getElementById('anuncio-titulo').value = anuncio.titulo || ''
    document.getElementById('anuncio-preco').value = anuncio.preco ?? ''
    document.getElementById('anuncio-estoque').value = anuncio.estoque ?? ''
    document.getElementById('anuncio-status').value = anuncio.status || 'ativo'
    document.getElementById('anuncio-tem-ads').checked = !!anuncio.tem_ads
    document.getElementById('anuncio-full').checked = !!anuncio.full
    document.getElementById('anuncio-em-promocao').checked = !!anuncio.em_promocao
  } else {
    document.getElementById('anuncio-id').value = ''
    document.getElementById('anuncio-produto').value = ''
    document.getElementById('anuncio-marketplace').value = ''
    document.getElementById('anuncio-sku').value = ''
    document.getElementById('anuncio-titulo').value = ''
    document.getElementById('anuncio-preco').value = ''
    document.getElementById('anuncio-estoque').value = ''
    document.getElementById('anuncio-status').value = 'ativo'
    document.getElementById('anuncio-tem-ads').checked = false
    document.getElementById('anuncio-full').checked = false
    document.getElementById('anuncio-em-promocao').checked = false
  }
}

function fecharFormulario() {
  const form = document.getElementById('anuncio-form')
  form.classList.add('hidden')
  anuncioEditando = null
}

async function carregarOpcoesMarketplaces() {
  try {
    const marketplaces = await carregarMarketplacesAtivos()
    preencherSelectMarketplaces(
      document.getElementById('anuncio-marketplace'),
      marketplaces,
      'Selecione um marketplace'
    )
    preencherSelectMarketplaces(
      document.getElementById('anuncios-filtro-marketplace'),
      marketplaces,
      'Todos os marketplaces'
    )
  } catch (error) {
    console.error('Erro ao carregar marketplaces:', error)
  }
}

async function carregarProdutos() {
  try {
    const response = await apiFetch('/produtos?limit=100')
    const produtos = Array.isArray(response.produtos) ? response.produtos : []
    preencherSelectProdutos(document.getElementById('anuncio-produto'), produtos)
  } catch (error) {
    console.error('Erro ao carregar produtos:', error)
  }
}

async function salvarAnuncio(event) {
  event.preventDefault()

  const anuncioId = Number(document.getElementById('anuncio-id').value)
  const dados = {
    produto_id: Number(document.getElementById('anuncio-produto').value),
    marketplace_id: Number(document.getElementById('anuncio-marketplace').value),
    sku_anuncio: document.getElementById('anuncio-sku').value.trim(),
    titulo: document.getElementById('anuncio-titulo').value.trim() || null,
    preco: Number(document.getElementById('anuncio-preco').value),
    estoque: Number(document.getElementById('anuncio-estoque').value),
    status: document.getElementById('anuncio-status').value,
    tem_ads: document.getElementById('anuncio-tem-ads').checked,
    full: document.getElementById('anuncio-full').checked,
    em_promocao: document.getElementById('anuncio-em-promocao').checked
  }

  if (!dados.produto_id) {
    setAnunciosFeedback('Produto e obrigatorio.', 'error')
    return
  }

  if (!dados.marketplace_id) {
    setAnunciosFeedback('Marketplace e obrigatorio.', 'error')
    return
  }

  if (!dados.sku_anuncio) {
    setAnunciosFeedback('SKU do anuncio e obrigatorio.', 'error')
    return
  }

  if (!Number.isFinite(dados.preco) || dados.preco <= 0) {
    setAnunciosFeedback('Preco do anuncio deve ser maior que zero.', 'error')
    return
  }

  if (!Number.isFinite(dados.estoque) || dados.estoque < 0) {
    setAnunciosFeedback('Estoque do anuncio deve ser zero ou maior.', 'error')
    return
  }

  try {
    if (anuncioEditando) {
      await apiFetch(`/anuncios/${anuncioId}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
      })
      setAnunciosFeedback('Anúncio atualizado com sucesso.', 'success')
    } else {
      await apiFetch('/anuncios', {
        method: 'POST',
        body: JSON.stringify(dados)
      })
      setAnunciosFeedback('Anúncio criado com sucesso.', 'success')
    }

    fecharFormulario()
    await carregarAnuncios(paginaAtual)
  } catch (error) {
    console.error('Erro ao salvar anúncio:', error)
    setAnunciosFeedback(`Erro ao salvar anúncio: ${error.message}`, 'error')
  }
}

async function excluirAnuncio(id) {
  if (!confirm('Tem certeza que deseja excluir este anúncio?')) {
    return
  }

  try {
    await apiFetch(`/anuncios/${id}`, {
      method: 'DELETE'
    })
    setAnunciosFeedback('Anúncio excluido com sucesso.', 'success')
    await carregarAnuncios(paginaAtual)
  } catch (error) {
    console.error('Erro ao excluir anúncio:', error)
    setAnunciosFeedback(`Erro ao excluir anúncio: ${error.message}`, 'error')
  }
}

window.editarAnuncio = function (id) {
  const anuncio = anunciosCache.find((item) => Number(item.id) === Number(id))
  if (anuncio) {
    abrirFormulario(anuncio)
  }
}

window.excluirAnuncio = excluirAnuncio

document.addEventListener('DOMContentLoaded', async () => {
  await carregarOpcoesMarketplaces()
  await carregarProdutos()
  carregarAnuncios()

  document.getElementById('novo-anuncio-button').addEventListener('click', () => abrirFormulario())
  document.getElementById('anuncio-cancelar-button').addEventListener('click', fecharFormulario)
  document.getElementById('anuncio-form').addEventListener('submit', salvarAnuncio)
  document.getElementById('anuncios-atualizar-button').addEventListener('click', () => carregarAnuncios(1))
  document.getElementById('anuncios-filtro-status').addEventListener('change', () => carregarAnuncios(1))
  document.getElementById('anuncios-filtro-marketplace').addEventListener('change', () => carregarAnuncios(1))
  document.getElementById('anuncios-busca').addEventListener('input', debounce(() => carregarAnuncios(1)))
})
