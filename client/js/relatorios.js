const PAGINACAO_JANELA = 2
let relatoriosProdutosPaginaAtual = 1
let relatoriosAnunciosPaginaAtual = 1
let relatoriosProdutosBusca = ''
let relatoriosAnunciosBusca = ''
let relatoriosProdutosFiltroCategoria = ''
let relatoriosProdutosFiltroSituacao = ''
let relatoriosAnunciosFiltroMarketplace = ''
let relatoriosAnunciosFiltroStatus = ''

function escapeHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function criarPaginacao(id, paginaAtual, totalPages, onPageChange) {
  const container = document.getElementById(id)
  if (!container) {
    return
  }

  container.innerHTML = ''

  if (!totalPages || totalPages <= 1) {
    return
  }

  const inicio = Math.max(1, paginaAtual - PAGINACAO_JANELA)
  const fim = Math.min(totalPages, paginaAtual + PAGINACAO_JANELA)

  const anteriorDesabilitado = paginaAtual <= 1 ? 'disabled' : ''
  const proximaDesabilitada = paginaAtual >= totalPages ? 'disabled' : ''

  container.innerHTML = `
    <button type="button" ${anteriorDesabilitado} data-page="${paginaAtual - 1}"><< Anterior</button>
    ${Array.from({ length: fim - inicio + 1 }, (_, index) => {
      const pagina = inicio + index
      return `
        <button type="button" data-page="${pagina}" ${pagina === paginaAtual ? 'disabled aria-current="page"' : ''}>
          ${pagina}
        </button>
      `
    }).join('')}
    <button type="button" ${proximaDesabilitada} data-page="${paginaAtual + 1}">Proxima >></button>
  `

  container.querySelectorAll('button[data-page]').forEach((button) => {
    const page = Number(button.dataset.page)
    button.addEventListener('click', () => onPageChange(page))
  })
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function setFeedback(id, mensagem, tipo = '') {
  const elemento = document.getElementById(id)
  if (!elemento) {
    return
  }

  elemento.className = `feedback ${tipo}`.trim()
  elemento.textContent = mensagem
}

async function carregarResumo() {
  try {
    const resumo = await apiFetch('/relatorios/resumo')

    document.getElementById('relatorios-total-produtos').textContent = resumo.total_produtos
    document.getElementById('relatorios-produtos-estoque-baixo').textContent = resumo.produtos_estoque_baixo
    document.getElementById('relatorios-valor-estoque').textContent = formatarMoeda(resumo.valor_estoque_estimado)
    document.getElementById('relatorios-total-anuncios').textContent = resumo.total_anuncios
    document.getElementById('relatorios-anuncios-ativos').textContent = resumo.anuncios_ativos
    document.getElementById('relatorios-anuncios-pausados').textContent = resumo.anuncios_pausados
    document.getElementById('relatorios-anuncios-sem-estoque').textContent = resumo.anuncios_sem_estoque
  } catch (error) {
    setFeedback('relatorios-produtos-feedback', error.message, 'text-danger')
  }
}

function renderSituacoes(situacoes) {
  if (!Array.isArray(situacoes) || !situacoes.length) {
    return '<span class="text-soft">Sem situação</span>'
  }

  return situacoes.map((situacao) => `<span class="pill">${escapeHtml(situacao)}</span>`).join(' ')
}

async function carregarCategoriasFiltro() {
  try {
    const response = await apiFetch('/categorias')
    const categorias = Array.isArray(response) ? response : (response.categorias || [])
    const select = document.getElementById('relatorios-produtos-filtro-categoria')

    if (!select) {
      return
    }

    select.innerHTML = '<option value="">Todas as categorias</option>'
    categorias.forEach((categoria) => {
      const option = document.createElement('option')
      option.value = categoria.id
      option.textContent = categoria.nome || categoria.slug || `Categoria ${categoria.id}`
      select.appendChild(option)
    })
  } catch (error) {
    console.error('Falha ao carregar categorias:', error)
  }
}

async function carregarMarketplacesFiltro() {
  try {
    const response = await apiFetch('/marketplaces')
    const marketplaces = Array.isArray(response) ? response : (response.marketplaces || [])
    const select = document.getElementById('relatorios-anuncios-filtro-marketplace')

    if (!select) {
      return
    }

    select.innerHTML = '<option value="">Todos os marketplaces</option>'
    marketplaces.forEach((marketplace) => {
      const option = document.createElement('option')
      option.value = marketplace.id
      option.textContent = marketplace.nome || marketplace.slug || `Marketplace ${marketplace.id}`
      select.appendChild(option)
    })
  } catch (error) {
    console.error('Falha ao carregar marketplaces:', error)
  }
}

async function carregarProdutos() {
  try {
    setFeedback('relatorios-produtos-feedback', '')

    const params = new URLSearchParams()
    params.set('page', relatoriosProdutosPaginaAtual)
    params.set('limit', 10)
    if (relatoriosProdutosBusca) params.set('q', relatoriosProdutosBusca)
    if (relatoriosProdutosFiltroCategoria) params.set('categoria_id', relatoriosProdutosFiltroCategoria)
    if (relatoriosProdutosFiltroSituacao) params.set('situacao', relatoriosProdutosFiltroSituacao)

    const dados = await apiFetch(`/relatorios/produtos?${params.toString()}`)
    const tabela = document.getElementById('relatorios-produtos-tabela')

    if (!Array.isArray(dados.produtos) || !dados.produtos.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="8">Nenhum produto encontrado.</td>
        </tr>
      `
      criarPaginacao('relatorios-produtos-paginacao', relatoriosProdutosPaginaAtual, dados.totalPages || 1, (page) => {
        relatoriosProdutosPaginaAtual = page
        carregarProdutos()
      })
      return
    }

    tabela.innerHTML = dados.produtos
      .map((produto) => `
        <tr>
          <td>${escapeHtml(produto.nome || produto.sku || '-')}</td>
          <td>${escapeHtml(produto.categoria_nome || 'Sem categoria')}</td>
          <td>${formatarMoeda(produto.custo)}</td>
          <td>${formatarMoeda(produto.preco_venda)}</td>
          <td>${escapeHtml(produto.quantidade)}</td>
          <td>${escapeHtml(produto.estoque_min)}</td>
          <td>${produto.margem_bruta_estimada !== null ? `${escapeHtml(produto.margem_bruta_estimada)}%` : '<span class="text-soft">Sem preço</span>'}</td>
          <td>${renderSituacoes(produto.situacoes)}</td>
        </tr>
      `)
      .join('')

    criarPaginacao('relatorios-produtos-paginacao', relatoriosProdutosPaginaAtual, dados.totalPages || 1, (page) => {
      relatoriosProdutosPaginaAtual = page
      carregarProdutos()
    })
  } catch (error) {
    setFeedback('relatorios-produtos-feedback', error.message, 'text-danger')
  }
}

async function carregarAnuncios() {
  try {
    setFeedback('relatorios-anuncios-feedback', '')

    const params = new URLSearchParams()
    params.set('page', relatoriosAnunciosPaginaAtual)
    params.set('limit', 10)
    if (relatoriosAnunciosBusca) params.set('q', relatoriosAnunciosBusca)
    if (relatoriosAnunciosFiltroMarketplace) params.set('marketplace_id', relatoriosAnunciosFiltroMarketplace)
    if (relatoriosAnunciosFiltroStatus) params.set('status', relatoriosAnunciosFiltroStatus)

    const dados = await apiFetch(`/relatorios/anuncios?${params.toString()}`)
    const tabela = document.getElementById('relatorios-anuncios-tabela')

    if (!Array.isArray(dados.anuncios) || !dados.anuncios.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="9">Nenhum anúncio encontrado.</td>
        </tr>
      `
      criarPaginacao('relatorios-anuncios-paginacao', relatoriosAnunciosPaginaAtual, dados.totalPages || 1, (page) => {
        relatoriosAnunciosPaginaAtual = page
        carregarAnuncios()
      })
      return
    }

    tabela.innerHTML = dados.anuncios
      .map((anuncio) => `
        <tr>
          <td>${escapeHtml(anuncio.produto_nome || '-')}</td>
          <td>${escapeHtml(anuncio.marketplace_nome || '-')}</td>
          <td>${escapeHtml(anuncio.sku_anuncio || '-')}</td>
          <td>${formatarMoeda(anuncio.preco)}</td>
          <td>${escapeHtml(anuncio.estoque)}</td>
          <td>${escapeHtml(anuncio.status)}</td>
          <td>${anuncio.tem_ads ? 'Sim' : 'Não'}</td>
          <td>${anuncio.full ? 'Sim' : 'Não'}</td>
          <td>${anuncio.em_promocao ? 'Sim' : 'Não'}</td>
        </tr>
      `)
      .join('')

    criarPaginacao('relatorios-anuncios-paginacao', relatoriosAnunciosPaginaAtual, dados.totalPages || 1, (page) => {
      relatoriosAnunciosPaginaAtual = page
      carregarAnuncios()
    })
  } catch (error) {
    setFeedback('relatorios-anuncios-feedback', error.message, 'text-danger')
  }
}

function inicializarFiltros() {
  const produtosBusca = document.getElementById('relatorios-produtos-busca')
  const produtosCategoria = document.getElementById('relatorios-produtos-filtro-categoria')
  const produtosSituacao = document.getElementById('relatorios-produtos-filtro-situacao')
  const produtosAtualizar = document.getElementById('relatorios-produtos-atualizar')
  const anunciosBusca = document.getElementById('relatorios-anuncios-busca')
  const anunciosMarketplace = document.getElementById('relatorios-anuncios-filtro-marketplace')
  const anunciosStatus = document.getElementById('relatorios-anuncios-filtro-status')
  const anunciosAtualizar = document.getElementById('relatorios-anuncios-atualizar')

  if (produtosBusca) {
    produtosBusca.addEventListener('input', () => {
      relatoriosProdutosBusca = produtosBusca.value.trim()
      relatoriosProdutosPaginaAtual = 1
      carregarProdutos()
    })
  }

  if (produtosCategoria) {
    produtosCategoria.addEventListener('change', () => {
      relatoriosProdutosFiltroCategoria = produtosCategoria.value
      relatoriosProdutosPaginaAtual = 1
      carregarProdutos()
    })
  }

  if (produtosSituacao) {
    produtosSituacao.addEventListener('change', () => {
      relatoriosProdutosFiltroSituacao = produtosSituacao.value
      relatoriosProdutosPaginaAtual = 1
      carregarProdutos()
    })
  }

  if (produtosAtualizar) {
    produtosAtualizar.addEventListener('click', () => {
      relatoriosProdutosPaginaAtual = 1
      carregarProdutos()
    })
  }

  if (anunciosBusca) {
    anunciosBusca.addEventListener('input', () => {
      relatoriosAnunciosBusca = anunciosBusca.value.trim()
      relatoriosAnunciosPaginaAtual = 1
      carregarAnuncios()
    })
  }

  if (anunciosMarketplace) {
    anunciosMarketplace.addEventListener('change', () => {
      relatoriosAnunciosFiltroMarketplace = anunciosMarketplace.value
      relatoriosAnunciosPaginaAtual = 1
      carregarAnuncios()
    })
  }

  if (anunciosStatus) {
    anunciosStatus.addEventListener('change', () => {
      relatoriosAnunciosFiltroStatus = anunciosStatus.value
      relatoriosAnunciosPaginaAtual = 1
      carregarAnuncios()
    })
  }

  if (anunciosAtualizar) {
    anunciosAtualizar.addEventListener('click', () => {
      relatoriosAnunciosPaginaAtual = 1
      carregarAnuncios()
    })
  }
}

async function inicializarRelatorios() {
  await carregarResumo()
  await carregarCategoriasFiltro()
  await carregarMarketplacesFiltro()
  inicializarFiltros()
  await carregarProdutos()
  await carregarAnuncios()
}

inicializarRelatorios()
