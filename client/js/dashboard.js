const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

if (!localStorage.getItem('token')) {
  window.location.href = '/login.html'
}

const dashboardSubtitle = document.getElementById('dashboard-subtitle')
const feedbackElement = document.getElementById('dashboard-feedback')
const productsTableBody = document.getElementById('products-table-body')

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0))
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

function setMetric(id, value) {
  const element = document.getElementById(id)

  if (element) {
    element.textContent = value
  }
}

function setFeedback(message, isError = false) {
  if (!feedbackElement) {
    return
  }

  feedbackElement.textContent = message
  feedbackElement.style.color = isError ? '#8f3f20' : '#6a5a49'
}

function resolveMarketplaceLabel(produto) {
  if (Array.isArray(produto.marketplaces) && produto.marketplaces.length > 0) {
    return produto.marketplaces
      .slice(0, 2)
      .map((marketplace) => marketplace.nome)
      .join(', ')
  }

  if (produto.marketplace) {
    return produto.marketplace
  }

  return 'Nao informado'
}

function resolveMargin(produto) {
  if (Array.isArray(produto.marketplaces) && produto.marketplaces.length > 0) {
    return formatPercent(produto.marketplaces[0].margem || 0)
  }

  return formatPercent(produto.margem_desejada || produto.margem || 0)
}

function renderProducts(produtos) {
  if (!Array.isArray(produtos) || produtos.length === 0) {
    productsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">Nenhum produto encontrado.</td>
      </tr>
    `
    setMetric('metric-listed', '0')
    return
  }

  productsTableBody.innerHTML = produtos.map((produto) => `
    <tr>
      <td>${produto.nome}</td>
      <td>${formatCurrency(produto.custo)}</td>
      <td>${formatCurrency(produto.preco_venda || produto.preco)}</td>
      <td>${resolveMargin(produto)}</td>
      <td>${resolveMarketplaceLabel(produto)}</td>
    </tr>
  `).join('')

  setMetric('metric-listed', String(produtos.length))
}

async function carregarDashboard() {
  try {
    setFeedback('Carregando dados...')

    if (usuario.nome) {
      dashboardSubtitle.textContent = `Bem-vindo, ${usuario.nome}. Acompanhe margem, lucro e canais ativos em um unico painel.`
    }

    const [summary, productsResponse, marketplacesResponse] = await Promise.all([
      apiFetch('/analise/dashboard'),
      apiFetch('/produtos?limit=8&page=1'),
      apiFetch('/marketplaces')
    ])

    setMetric('metric-products', String(summary.total_produtos || 0))
    setMetric('metric-marketplaces', String((marketplacesResponse.marketplaces || []).filter((item) => item.ativo !== false).length))
    setMetric('metric-margin', formatPercent(summary.margem_media || 0))
    setMetric('metric-profit', formatCurrency(summary.lucro_estimado || 0))
    setMetric('metric-negative', String(summary.produtos_margem_negativa || 0))
    setMetric('last-price-value', formatCurrency(summary.ultimo_calculo_valor || 0))
    setMetric('last-price-label', summary.ultimo_calculo_label || 'Nenhum calculo registrado')

    renderProducts(productsResponse.produtos || [])
    setFeedback('Dados atualizados.')
  } catch (error) {
    setFeedback(error.message, true)

    if (error.message.toLowerCase().includes('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login.html'
    }
  }
}

document.getElementById('refresh-button')?.addEventListener('click', carregarDashboard)

carregarDashboard()
