let paginaAtual = 1
let buscaAtual = ''
let marketplacesCache = []
let produtoEmEdicao = null
let produtosCache = []
let produtosDestacados = new Set()
let marketplaceDestaques = new Set()
let marketplaceComparacoes = new Map()
let inlineDirty = new Set()
let inlineTimers = new Map()
let inlineSaving = new Set()
let ordenacaoMarketplaces = 'nome'
let autocompleteTimer = null

function getToken() {
  return localStorage.getItem('token')
}

function setFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('produtos-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function esconderSugestoesProduto() {
  const container = document.getElementById('produto-sugestoes')
  container.classList.add('hidden')
  container.innerHTML = ''
}

function renderSugestoesProduto(produtos) {
  const container = document.getElementById('produto-sugestoes')

  if (!produtos.length) {
    esconderSugestoesProduto()
    return
  }

  container.innerHTML = produtos
    .map(
      (produto) => `
        <button
          type="button"
          class="autocomplete-item"
          data-sugestao-id="${produto.id}"
          data-sugestao-nome="${produto.nome}"
          data-sugestao-barcode="${produto.barcode || ''}"
          data-sugestao-ncm="${produto.ncm || ''}"
          data-sugestao-custo="${produto.custo || 0}"
          data-sugestao-preco-venda="${produto.preco_venda || 0}"
          data-sugestao-descricao="${produto.descricao || ''}"
        >
          <strong>${produto.nome}</strong>
          <span>Custo ${formatarMoeda(produto.custo)} | Venda ${formatarMoeda(produto.preco_venda)}</span>
        </button>
      `
    )
    .join('')

  container.classList.remove('hidden')
}

async function buscarSugestoesProduto(query) {
  if (query.trim().length < 2) {
    esconderSugestoesProduto()
    return
  }

  try {
    const dados = await apiFetch(`/produtos/buscar?q=${encodeURIComponent(query)}`)
    renderSugestoesProduto(dados.produtos || [])
  } catch (error) {
    esconderSugestoesProduto()
  }
}

function getMarketplaceKey(produtoId, marketplaceId) {
  return `${produtoId}:${marketplaceId}`
}

function destacarProdutos(ids) {
  produtosDestacados = new Set((ids || []).map((id) => Number(id)).filter(Boolean))

  if (!produtosDestacados.size) {
    return
  }

  window.setTimeout(() => {
    produtosDestacados.clear()
    document.querySelectorAll('.row-highlight').forEach((row) => {
      row.classList.remove('row-highlight')
    })
  }, 2600)
}

function destacarMarketplaces(chaves) {
  marketplaceDestaques = new Set(chaves || [])

  if (!marketplaceDestaques.size) {
    return
  }

  window.setTimeout(() => {
    marketplaceDestaques.clear()
    document.querySelectorAll('.marketplace-highlight').forEach((item) => {
      item.classList.remove('marketplace-highlight')
    })
  }, 2600)
}

function setButtonLoading(button, loading, labelIdle, labelLoading) {
  if (!button) {
    return
  }

  button.disabled = loading
  button.textContent = loading ? labelLoading : labelIdle
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function formatarPercentual(valor) {
  return `${(Number(valor || 0) * 100).toFixed(2)}%`
}

function calcularPrecoDireto(custo, margemDesejada) {
  const custoNumero = Number(custo || 0)
  const margemNumero = Number(margemDesejada || 0)

  if (!custoNumero || !margemNumero || margemNumero >= 1) {
    return ''
  }

  return (custoNumero / (1 - margemNumero)).toFixed(2)
}

function atualizarTituloFormulario() {
  document.getElementById('produto-form-titulo').textContent = produtoEmEdicao
    ? 'Editar Produto'
    : 'Novo Produto'
  document.getElementById('produto-submit-button').textContent = produtoEmEdicao
    ? 'Atualizar Produto'
    : 'Salvar Produto'
}

function atualizarLogicaPrecoMargem() {
  const custoInput = document.getElementById('custo')
  const precoVendaInput = document.getElementById('preco_venda')
  const margemInput = document.getElementById('margem_desejada')

  const custo = custoInput.value.trim()
  const precoVenda = precoVendaInput.value.trim()
  const margem = margemInput.value.trim()

  if (precoVenda && !precoVendaInput.readOnly) {
    margemInput.disabled = true
    return
  }

  margemInput.disabled = false

  if (margem) {
    precoVendaInput.value = calcularPrecoDireto(custo, margem)
    precoVendaInput.readOnly = true
    return
  }

  precoVendaInput.readOnly = false
}

async function apiFetch(url, options = {}) {
  const token = getToken()

  const resposta = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })

  if (resposta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.top.location.href = '/'
    throw new Error('Sessao expirada')
  }

  const contentType = resposta.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!resposta.ok) {
    if (isJson) {
      const dadosErro = await resposta.json()
      throw new Error(dadosErro.erro || 'Erro na requisicao')
    }

    const textoErro = await resposta.text()
    throw new Error(textoErro || 'Erro na requisicao')
  }

  if (!isJson) {
    const texto = await resposta.text()
    throw new Error(`Resposta invalida da API: ${texto.slice(0, 120)}`)
  }

  return resposta.json()
}

function renderMarketplacesCheckboxes() {
  const container = document.getElementById('marketplaces-checkboxes')
  container.innerHTML = ''

  if (!marketplacesCache.length) {
    container.innerHTML = '<span class="text-danger">Nenhum marketplace cadastrado.</span>'
    return
  }

  marketplacesCache.forEach((marketplace) => {
    container.innerHTML += `
      <label class="checkbox-card">
        <input type="checkbox" name="marketplaces" value="${marketplace.id}">
        <span>${marketplace.nome}</span>
      </label>
    `
  })

  document.querySelectorAll('input[name="marketplaces"]').forEach((checkbox) => {
    checkbox.addEventListener('change', renderCamposMargemMarketplaces)
  })
}

async function loadMarketplaces() {
  const dados = await apiFetch('/marketplaces')
  marketplacesCache = dados.marketplaces
  renderMarketplacesCheckboxes()
  renderCamposMargemMarketplaces()
}

function getSelectedMarketplaces() {
  return Array.from(
    document.querySelectorAll('input[name="marketplaces"]:checked')
  ).map((checkbox) => Number(checkbox.value))
}

function obterMargemDefault() {
  return document.getElementById('margem_desejada').value || '0'
}

function renderCamposMargemMarketplaces() {
  const container = document.getElementById('marketplaces-margens')
  const selecionados = getSelectedMarketplaces()
  const margensExistentes = new Map()

  document.querySelectorAll('[data-marketplace-margin-id]').forEach((input) => {
    margensExistentes.set(Number(input.dataset.marketplaceMarginId), input.value)
  })

  container.innerHTML = ''

  if (!selecionados.length) {
    container.innerHTML = '<span class="text-soft">Selecione marketplaces para definir margens especificas.</span>'
    return
  }

  selecionados.forEach((marketplaceId) => {
    const marketplace = marketplacesCache.find((item) => item.id === marketplaceId)
    const valor = margensExistentes.get(marketplaceId) ?? obterMargemDefault()

    if (!marketplace) {
      return
    }

    container.innerHTML += `
      <div class="field">
        <label for="marketplace-margem-${marketplace.id}">${marketplace.nome}</label>
        <input
          id="marketplace-margem-${marketplace.id}"
          data-marketplace-margin-id="${marketplace.id}"
          type="number"
          step="0.0001"
          value="${valor}"
          placeholder="Ex.: 0.20"
        >
      </div>
    `
  })
}

function getPayloadMarketplaces() {
  return getSelectedMarketplaces().map((marketplaceId) => {
    const margemInput = document.querySelector(
      `[data-marketplace-margin-id="${marketplaceId}"]`
    )

    return {
      id: marketplaceId,
      margem: margemInput ? margemInput.value || obterMargemDefault() || 0 : 0
    }
  })
}

function ordenarMarketplaces(marketplaces) {
  const lista = [...marketplaces]

  if (ordenacaoMarketplaces === 'preco_desc') {
    return lista.sort((a, b) => Number(b.preco_calculado || 0) - Number(a.preco_calculado || 0))
  }

  if (ordenacaoMarketplaces === 'margem_desc') {
    return lista.sort((a, b) => Number(b.margem_real || 0) - Number(a.margem_real || 0))
  }

  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

function getStatusBadge(marketplace) {
  const classes = {
    calculado: 'status-badge status-ok',
    sem_taxa: 'status-badge status-warn',
    margem_invalida: 'status-badge status-error'
  }

  return `<span class="${classes[marketplace.status] || 'status-badge'}">${marketplace.status_label}</span>`
}

function marcarInlinePendente(produtoId, marketplaceId, pendente) {
  const key = getMarketplaceKey(produtoId, marketplaceId)
  const input = document.querySelector(
    `[data-inline-product-id="${produtoId}"][data-inline-marketplace-id="${marketplaceId}"]`
  )

  if (pendente) {
    inlineDirty.add(key)
    input?.classList.add('inline-pending')
    return
  }

  inlineDirty.delete(key)
  input?.classList.remove('inline-pending')
}

function limparTimerInline(key) {
  const timer = inlineTimers.get(key)

  if (timer) {
    clearTimeout(timer)
    inlineTimers.delete(key)
  }
}

function registrarComparacoes(precoAnteriorProduto, produtoAtualizado) {
  const chaves = []

  ;(produtoAtualizado.marketplaces || []).forEach((marketplace) => {
    const anterior = precoAnteriorProduto?.marketplaces?.find((item) => item.id === marketplace.id)
    const key = getMarketplaceKey(produtoAtualizado.id, marketplace.id)

    if (anterior && Number(anterior.preco_calculado) !== Number(marketplace.preco_calculado)) {
      marketplaceComparacoes.set(key, {
        anterior: Number(anterior.preco_calculado || 0),
        atual: Number(marketplace.preco_calculado || 0)
      })
      chaves.push(key)
    } else if (!anterior && Number(marketplace.preco_calculado || 0) > 0) {
      marketplaceComparacoes.set(key, {
        anterior: 0,
        atual: Number(marketplace.preco_calculado || 0)
      })
      chaves.push(key)
    } else {
      marketplaceComparacoes.delete(key)
    }
  })

  destacarMarketplaces(chaves)
}

async function salvarProduto() {
  const produtoId = document.getElementById('produto-id').value
  const submitButton = document.getElementById('produto-submit-button')
  const produtoAnterior = produtosCache.find((item) => item.id === Number(produtoId))
  const produto = {
    nome: document.getElementById('nome').value.trim(),
    barcode: document.getElementById('barcode').value.trim(),
    ncm: document.getElementById('ncm').value.trim(),
    custo: document.getElementById('custo').value,
    preco_venda: document.getElementById('preco_venda').value,
    margem_desejada: document.getElementById('margem_desejada').value,
    quantidade: document.getElementById('quantidade').value || 0,
    estoque_min: document.getElementById('estoque_min').value || 0,
    estoque_max: document.getElementById('estoque_max').value || 0,
    localizacao: document.getElementById('localizacao').value.trim(),
    descricao: document.getElementById('descricao').value.trim(),
    marketplaces: getPayloadMarketplaces()
  }

  setButtonLoading(submitButton, true, produtoId ? 'Atualizar Produto' : 'Salvar Produto', 'Salvando...')

  try {
    const resposta = await apiFetch(produtoId ? `/produtos/${produtoId}` : '/produtos', {
      method: produtoId ? 'PUT' : 'POST',
      body: JSON.stringify(produto)
    })

    destacarProdutos([resposta.produto?.id])
    registrarComparacoes(produtoAnterior, resposta.produto)
    limparFormulario()
    setFeedback(
      produtoId ? 'Produto atualizado com sucesso.' : 'Produto salvo com sucesso.',
      'text-success'
    )
    await carregarProdutos(paginaAtual, buscaAtual)
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  } finally {
    setButtonLoading(submitButton, false, produtoId ? 'Atualizar Produto' : 'Salvar Produto', 'Salvando...')
  }
}

async function recalcularPrecos() {
  try {
    const resultado = await apiFetch('/produtos/recalcular-precos', {
      method: 'POST',
      body: JSON.stringify({})
    })

    destacarProdutos((resultado.atualizados || []).map((item) => item.produto_id))
    destacarMarketplaces(
      (resultado.atualizados || []).map((item) =>
        getMarketplaceKey(item.produto_id, item.marketplace_id)
      )
    )

    ;(resultado.atualizados || []).forEach((item) => {
      marketplaceComparacoes.set(
        getMarketplaceKey(item.produto_id, item.marketplace_id),
        {
          anterior: Number(item.preco_anterior || 0),
          atual: Number(item.preco_novo || 0)
        }
      )
    })

    setFeedback(
      `Precos recalculados: ${resultado.total_atualizados} marketplaces atualizados, ${resultado.total_ignorados} ignorados.`,
      'text-success'
    )
    await carregarProdutos(paginaAtual, buscaAtual)
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  }
}

async function recalcularProduto(produtoId, button) {
  const produtoAnterior = produtosCache.find((item) => item.id === produtoId)
  setButtonLoading(button, true, 'Recalcular', 'Recalculando...')

  try {
    const resultado = await apiFetch(`/produtos/${produtoId}/recalcular-precos`, {
      method: 'POST',
      body: JSON.stringify({})
    })

    destacarProdutos([produtoId])
    destacarMarketplaces(
      (resultado.atualizados || []).map((item) =>
        getMarketplaceKey(item.produto_id, item.marketplace_id)
      )
    )

    ;(resultado.atualizados || []).forEach((item) => {
      marketplaceComparacoes.set(
        getMarketplaceKey(item.produto_id, item.marketplace_id),
        {
          anterior: Number(item.preco_anterior || 0),
          atual: Number(item.preco_novo || 0)
        }
      )
    })

    if (produtoAnterior) {
      registrarComparacoes(produtoAnterior, {
        id: produtoId,
        marketplaces: (resultado.atualizados || []).map((item) => ({
          id: item.marketplace_id,
          preco_calculado: item.preco_novo
        }))
      })
    }

    setFeedback('Produto recalculado com sucesso.', 'text-success')
    await carregarProdutos(paginaAtual, buscaAtual)
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  } finally {
    setButtonLoading(button, false, 'Recalcular', 'Recalculando...')
  }
}

async function excluirProduto(id) {
  try {
    await apiFetch(`/produtos/${id}`, {
      method: 'DELETE'
    })

    if (produtoEmEdicao === id) {
      limparFormulario()
    }

    setFeedback('Produto removido com sucesso.', 'text-success')
    await carregarProdutos(paginaAtual, buscaAtual)
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  }
}

function renderMarketplaces(produto) {
  if (!produto.marketplaces.length) {
    return '<span class="text-soft">Nenhum</span>'
  }

  return ordenarMarketplaces(produto.marketplaces)
    .map((marketplace) => `<span class="pill">${marketplace.nome}</span>`)
    .join(' ')
}

function renderPrecosCalculados(produto) {
  if (!produto.marketplaces.length) {
    return '<span class="text-soft">Sem marketplaces</span>'
  }

  return ordenarMarketplaces(produto.marketplaces)
    .map((marketplace) => {
      const key = getMarketplaceKey(produto.id, marketplace.id)
      const comparacao = marketplaceComparacoes.get(key)
      const pendente = inlineDirty.has(key) ? 'inline-unsaved' : ''
      const destaque = marketplaceDestaques.has(key) ? 'marketplace-highlight' : ''
      const comparativo = comparacao
        ? `<div class="price-diff">${formatarMoeda(comparacao.anterior)} -> ${formatarMoeda(comparacao.atual)}</div>`
        : ''

      return `
        <div class="inline-marketplace-card ${destaque}">
          <div class="inline-marketplace-head">
            <strong>${marketplace.nome}</strong>
            ${getStatusBadge(marketplace)}
          </div>
          <div>${formatarMoeda(marketplace.preco_calculado)} | Lucro ${formatarMoeda(marketplace.lucro_estimado || 0)}</div>
          <div>Margem real ${formatarPercentual(marketplace.margem_real || 0)}</div>
          ${comparativo}
          <div class="inline-marketplace-controls">
            <input
              class="inline-margin-input ${pendente}"
              type="number"
              step="0.0001"
              value="${marketplace.margem}"
              data-inline-marketplace-id="${marketplace.id}"
              data-inline-product-id="${produto.id}"
            >
            <span class="inline-marketplace-meta">${inlineDirty.has(key) ? 'Pendente' : 'Salvo'}</span>
          </div>
        </div>
      `
    })
    .join('')
}

function montarPayloadProduto(produto, marketplaces) {
  return {
    nome: produto.nome,
    barcode: produto.barcode || '',
    ncm: produto.ncm || '',
    custo: produto.custo,
    preco_venda: produto.preco_venda,
    margem_desejada: produto.margem_desejada,
    quantidade: produto.quantidade || 0,
    estoque_min: produto.estoque_min || 0,
    estoque_max: produto.estoque_max || 0,
    localizacao: produto.localizacao || '',
    descricao: produto.descricao || '',
    marketplaces
  }
}

async function salvarMargensInline(produtoId, button = null) {
  const produto = produtosCache.find((item) => item.id === produtoId)

  if (!produto) {
    setFeedback('Produto nao encontrado para atualizar margens.', 'text-danger')
    return
  }

  const marketplacesAtualizados = produto.marketplaces.map((marketplace) => {
    const input = document.querySelector(
      `[data-inline-product-id="${produtoId}"][data-inline-marketplace-id="${marketplace.id}"]`
    )

    return {
      id: marketplace.id,
      margem: input ? input.value : marketplace.margem
    }
  })

  const produtoAnterior = JSON.parse(JSON.stringify(produto))
  const keys = marketplacesAtualizados.map((item) => getMarketplaceKey(produtoId, item.id))
  keys.forEach((key) => {
    inlineSaving.add(key)
    limparTimerInline(key)
  })
  setButtonLoading(button, true, 'Salvar margens', 'Salvando...')

  try {
    const resposta = await apiFetch(`/produtos/${produtoId}`, {
      method: 'PUT',
      body: JSON.stringify(montarPayloadProduto(produto, marketplacesAtualizados))
    })

    keys.forEach((key) => {
      inlineSaving.delete(key)
      inlineDirty.delete(key)
    })
    destacarProdutos([resposta.produto?.id])
    registrarComparacoes(produtoAnterior, resposta.produto)
    destaqueMarketplacesFromProduct(resposta.produto)
    setFeedback('Margens por marketplace atualizadas com sucesso.', 'text-success')
    await carregarProdutos(paginaAtual, buscaAtual)
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  } finally {
    setButtonLoading(button, false, 'Salvar margens', 'Salvando...')
  }
}

function destaqueMarketplacesFromProduct(produto) {
  destacarMarketplaces(
    (produto.marketplaces || []).map((item) => getMarketplaceKey(produto.id, item.id))
  )
}

function preencherFormulario(produto) {
  produtoEmEdicao = produto.id
  document.getElementById('produto-id').value = produto.id
  document.getElementById('nome').value = produto.nome || ''
  document.getElementById('barcode').value = produto.barcode || ''
  document.getElementById('ncm').value = produto.ncm || ''
  document.getElementById('custo').value = produto.custo || ''
  document.getElementById('preco_venda').value = produto.preco_venda || ''
  document.getElementById('margem_desejada').value = produto.margem_desejada || ''
  document.getElementById('quantidade').value = produto.quantidade || ''
  document.getElementById('estoque_min').value = produto.estoque_min || ''
  document.getElementById('estoque_max').value = produto.estoque_max || ''
  document.getElementById('localizacao').value = produto.localizacao || ''
  document.getElementById('descricao').value = produto.descricao || ''

  document.querySelectorAll('input[name="marketplaces"]').forEach((checkbox) => {
    checkbox.checked = produto.marketplaces.some(
      (marketplace) => marketplace.id === Number(checkbox.value)
    )
  })

  renderCamposMargemMarketplaces()

  produto.marketplaces.forEach((marketplace) => {
    const input = document.querySelector(
      `[data-marketplace-margin-id="${marketplace.id}"]`
    )

    if (input) {
      input.value = marketplace.margem
    }
  })

  atualizarTituloFormulario()
  atualizarLogicaPrecoMargem()
}

function editarProduto(id) {
  const produto = produtosCache.find((item) => item.id === id)

  if (!produto) {
    setFeedback('Produto nao encontrado para edicao.', 'text-danger')
    return
  }

  preencherFormulario(produto)
  setFeedback('Modo de edicao ativado.', 'text-success')
}

async function carregarProdutos(page = 1, busca = '') {
  try {
    const dados = await apiFetch(
      `/produtos?page=${page}&busca=${encodeURIComponent(busca)}`
    )

    produtosCache = dados.produtos
    const tabela = document.getElementById('tabela-produtos')
    tabela.innerHTML = ''

    if (!dados.produtos.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="10">Nenhum produto cadastrado.</td>
        </tr>
      `
      criarPaginacao(dados.totalPages)
      return
    }

    dados.produtos.forEach((produto) => {
      tabela.innerHTML += `
        <tr class="${produtosDestacados.has(Number(produto.id)) ? 'row-highlight' : ''}">
          <td>${produto.id}</td>
          <td>${produto.nome}</td>
          <td>${renderMarketplaces(produto)}</td>
          <td>${formatarPercentual(produto.margem_desejada || 0)}</td>
          <td>${produto.quantidade || 0}</td>
          <td>${formatarMoeda(produto.custo)}</td>
          <td>${formatarMoeda(produto.preco_venda)}</td>
          <td>${renderPrecosCalculados(produto)}</td>
          <td>${produto.localizacao || ''}</td>
          <td>
            <div class="table-actions">
              <button
                class="button-primary"
                data-inline-save-button="${produto.id}"
                onclick="salvarMargensInline(${produto.id}, this)"
              >
                Salvar margens
              </button>
              <button
                class="button-secondary"
                onclick="recalcularProduto(${produto.id}, this)"
              >
                Recalcular
              </button>
              <button class="button-secondary" onclick="editarProduto(${produto.id})">Editar</button>
              <button class="button-danger" onclick="excluirProduto(${produto.id})">Excluir</button>
            </div>
          </td>
        </tr>
      `
    })

    criarPaginacao(dados.totalPages)
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  }
}

function criarPaginacao(totalPages) {
  const paginacao = document.getElementById('paginacao')
  paginacao.innerHTML = ''

  for (let i = 1; i <= totalPages; i += 1) {
    paginacao.innerHTML += `
      <button onclick="irParaPagina(${i})">${i}</button>
    `
  }
}

function irParaPagina(pagina) {
  paginaAtual = pagina
  carregarProdutos(paginaAtual, buscaAtual)
}

function limparFormulario() {
  produtoEmEdicao = null
  document.getElementById('produto-id').value = ''
  document.getElementById('nome').value = ''
  document.getElementById('barcode').value = ''
  document.getElementById('ncm').value = ''
  document.getElementById('custo').value = ''
  document.getElementById('preco_venda').value = ''
  document.getElementById('margem_desejada').value = ''
  document.getElementById('quantidade').value = ''
  document.getElementById('estoque_min').value = ''
  document.getElementById('estoque_max').value = ''
  document.getElementById('localizacao').value = ''
  document.getElementById('descricao').value = ''

  document.querySelectorAll('input[name="marketplaces"]').forEach((checkbox) => {
    checkbox.checked = false
  })

  document.getElementById('preco_venda').readOnly = false
  document.getElementById('margem_desejada').disabled = false
  atualizarTituloFormulario()
  renderCamposMargemMarketplaces()
  atualizarLogicaPrecoMargem()
}

function cancelarEdicaoProduto() {
  limparFormulario()
  setFeedback('')
}

function handleInlineInputChange(event) {
  const input = event.target

  if (!input.matches('[data-inline-marketplace-id]')) {
    return
  }

  const produtoId = Number(input.dataset.inlineProductId)
  const marketplaceId = Number(input.dataset.inlineMarketplaceId)
  const key = getMarketplaceKey(produtoId, marketplaceId)
  marcarInlinePendente(produtoId, marketplaceId, true)
  limparTimerInline(key)

  const timer = window.setTimeout(() => {
    const saveButton = document.querySelector(`[data-inline-save-button="${produtoId}"]`)
    salvarMargensInline(produtoId, saveButton)
  }, 900)

  inlineTimers.set(key, timer)
}

function handleInlineKeydown(event) {
  const input = event.target

  if (!input.matches('[data-inline-marketplace-id]')) {
    return
  }

  if (event.key !== 'Enter') {
    return
  }

  event.preventDefault()
  const produtoId = Number(input.dataset.inlineProductId)
  const marketplaceId = Number(input.dataset.inlineMarketplaceId)
  const key = getMarketplaceKey(produtoId, marketplaceId)
  limparTimerInline(key)
  const saveButton = document.querySelector(`[data-inline-save-button="${produtoId}"]`)
  salvarMargensInline(produtoId, saveButton)
}

function handleNomeProdutoInput() {
  const nomeInput = document.getElementById('nome')
  const query = nomeInput.value

  if (autocompleteTimer) {
    clearTimeout(autocompleteTimer)
  }

  autocompleteTimer = window.setTimeout(() => {
    buscarSugestoesProduto(query)
  }, 250)
}

function handleCliqueSugestao(event) {
  const botao = event.target.closest('[data-sugestao-id]')

  if (!botao) {
    return
  }

  document.getElementById('nome').value = botao.dataset.sugestaoNome || ''
  document.getElementById('barcode').value = botao.dataset.sugestaoBarcode || ''
  document.getElementById('ncm').value = botao.dataset.sugestaoNcm || ''
  document.getElementById('custo').value = botao.dataset.sugestaoCusto || ''
  document.getElementById('preco_venda').value = botao.dataset.sugestaoPrecoVenda || ''
  document.getElementById('descricao').value = botao.dataset.sugestaoDescricao || ''
  atualizarLogicaPrecoMargem()
  esconderSugestoesProduto()
  setFeedback('Sugestao preenchida com nome, barcode, NCM e custo. Voce ainda pode ajustar os dados.', 'text-success')
}

document
  .getElementById('busca-produto')
  .addEventListener('input', function () {
    buscaAtual = this.value
    paginaAtual = 1
    carregarProdutos(paginaAtual, buscaAtual)
  })

document
  .getElementById('ordenacao-marketplaces')
  .addEventListener('change', function () {
    ordenacaoMarketplaces = this.value
    carregarProdutos(paginaAtual, buscaAtual)
  })

document.getElementById('custo').addEventListener('input', atualizarLogicaPrecoMargem)
document.getElementById('preco_venda').addEventListener('input', atualizarLogicaPrecoMargem)
document.getElementById('margem_desejada').addEventListener('input', function () {
  atualizarLogicaPrecoMargem()
  renderCamposMargemMarketplaces()
})
document.getElementById('nome').addEventListener('input', handleNomeProdutoInput)
document.getElementById('produto-sugestoes').addEventListener('click', handleCliqueSugestao)
document.getElementById('nome').addEventListener('blur', function () {
  window.setTimeout(esconderSugestoesProduto, 150)
})
document.getElementById('nome').addEventListener('focus', function () {
  if (this.value.trim().length >= 2) {
    buscarSugestoesProduto(this.value)
  }
})

document.getElementById('tabela-produtos').addEventListener('input', handleInlineInputChange)
document.getElementById('tabela-produtos').addEventListener('keydown', handleInlineKeydown)

Promise.all([loadMarketplaces(), carregarProdutos()]).catch((error) => {
  setFeedback(error.message, 'text-danger')
})
