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
let buscaProdutosTimer = null
let selectedMarketplacesState = []
let produtoSelecionadoId = null
let simulacaoAberta = false
let concorrenteInputs = new Map()

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

function formatarPercentualParaInput(valor) {
  return (Number(valor || 0) * 100).toFixed(2).replace(/\.00$/, '')
}

function normalizarPercentualInput(valor) {
  const numero = Number(String(valor || '').replace(',', '.'))

  if (Number.isNaN(numero) || numero < 0) {
    return 0
  }

  return numero > 1 ? numero / 100 : numero
}

function normalizarValorMonetarioInput(valor) {
  const numero = Number(String(valor || '').replace(',', '.'))

  if (Number.isNaN(numero) || numero < 0) {
    return 0
  }

  return numero
}

function calcularPrecoSimulado(custo, margem, taxa) {
  const custoBase = normalizarValorMonetarioInput(custo)
  const margemDesejada = normalizarPercentualInput(margem)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)
  const taxasTotaisPercentuais = taxaPercentual + imposto + indiceExtra
  const divisorMargem = 1 - taxasTotaisPercentuais - margemDesejada

  if (divisorMargem <= 0) {
    return {
      preco_sugerido: 0,
      margem_real: 0,
      erro: 'Percentuais e margem somam 100% ou mais'
    }
  }

  const preco = (custoBase + freteMedio + taxaFixa) / divisorMargem
  const valorTaxa = preco * taxaPercentual
  const valorIndiceExtra = preco * indiceExtra
  const valorImposto = preco * imposto
  const lucro = preco - custoBase - freteMedio - taxaFixa - valorTaxa - valorIndiceExtra - valorImposto

  return {
    preco_sugerido: Number(preco.toFixed(2)),
    margem_real: preco > 0 ? Number((lucro / preco).toFixed(4)) : 0,
    erro: ''
  }
}

function getConcorrenteKey(produtoId, marketplaceId) {
  return `${produtoId}:${marketplaceId}`
}

function calcularResultadoConcorrente(custo, precoConcorrente, taxa) {
  const custoBase = normalizarValorMonetarioInput(custo)
  const preco = normalizarValorMonetarioInput(precoConcorrente)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)

  if (!preco) {
    return {
      lucro: 0,
      margem: 0,
      possuiValor: false,
      prejuizo: false
    }
  }

  const valorTaxa = preco * taxaPercentual
  const valorIndiceExtra = preco * indiceExtra
  const valorImposto = preco * imposto
  const lucro = preco - custoBase - freteMedio - taxaFixa - valorTaxa - valorIndiceExtra - valorImposto

  return {
    lucro: Number(lucro.toFixed(2)),
    margem: preco > 0 ? Number((lucro / preco).toFixed(4)) : 0,
    possuiValor: true,
    prejuizo: lucro < 0
  }
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

function getMarketplaceById(marketplaceId) {
  return marketplacesCache.find((item) => item.id === Number(marketplaceId))
}

function collectSelectedMarketplacesFromTable() {
  return Array.from(document.querySelectorAll('[data-selected-marketplace-id]'))
    .map((row) => ({
      id: Number(row.dataset.selectedMarketplaceId),
      margem: row.querySelector('[data-marketplace-margin-id]')?.value || obterMargemDefault() || 0
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0)
}

function syncSelectedMarketplacesState() {
  selectedMarketplacesState = collectSelectedMarketplacesFromTable()
}

function renderMarketplaceSelectOptions() {
  const select = document.getElementById('marketplace-select')
  const selectedIds = new Set(selectedMarketplacesState.map((item) => Number(item.id)))

  select.innerHTML = '<option value="">Selecione um marketplace</option>'

  marketplacesCache
    .filter((marketplace) => !selectedIds.has(Number(marketplace.id)))
    .forEach((marketplace) => {
      select.innerHTML += `<option value="${marketplace.id}">${marketplace.nome}</option>`
    })
}

async function loadMarketplaces() {
  const dados = await apiFetch('/marketplaces')
  marketplacesCache = dados.marketplaces
  renderMarketplaceSelectOptions()
  renderCamposMargemMarketplaces()
}

function obterMargemDefault() {
  return document.getElementById('margem_desejada').value || '0'
}

function renderCamposMargemMarketplaces() {
  const container = document.getElementById('marketplaces-margens')
  const margensExistentes = new Map(selectedMarketplacesState.map((item) => [Number(item.id), item.margem]))

  container.innerHTML = ''

  if (!selectedMarketplacesState.length) {
    container.innerHTML = `
      <tr>
        <td colspan="3"><span class="text-soft">Adicione marketplaces para definir margens especificas.</span></td>
      </tr>
    `
    renderMarketplaceSelectOptions()
    return
  }

  selectedMarketplacesState.forEach((selecionado) => {
    const marketplaceId = Number(selecionado.id)
    const marketplace = getMarketplaceById(marketplaceId)
    const valor = margensExistentes.get(marketplaceId) ?? obterMargemDefault()

    if (!marketplace) {
      return
    }

    container.innerHTML += `
      <tr data-selected-marketplace-id="${marketplace.id}">
        <td>${marketplace.nome}</td>
        <td>
          <input
            id="marketplace-margem-${marketplace.id}"
            data-marketplace-margin-id="${marketplace.id}"
            type="number"
            step="0.0001"
            value="${valor}"
            placeholder="Ex.: 0.20"
          >
        </td>
        <td>
          <button type="button" class="button-danger" onclick="removerMarketplaceSelecionado(${marketplace.id})">Remover</button>
        </td>
      </tr>
    `
  })

  renderMarketplaceSelectOptions()
}

function getPayloadMarketplaces() {
  return collectSelectedMarketplacesFromTable()
}

function adicionarMarketplaceSelecionado() {
  syncSelectedMarketplacesState()
  const select = document.getElementById('marketplace-select')
  const marketplaceId = Number(select.value)

  if (!Number.isInteger(marketplaceId) || marketplaceId <= 0) {
    setFeedback('Selecione um marketplace para adicionar.', 'text-danger')
    return
  }

  if (selectedMarketplacesState.some((item) => Number(item.id) === marketplaceId)) {
    setFeedback('Esse marketplace ja foi adicionado.', 'text-danger')
    return
  }

  selectedMarketplacesState.push({
    id: marketplaceId,
    margem: obterMargemDefault()
  })

  renderCamposMargemMarketplaces()
  select.value = ''
  setFeedback('', '')
}

function removerMarketplaceSelecionado(marketplaceId) {
  syncSelectedMarketplacesState()
  selectedMarketplacesState = selectedMarketplacesState.filter(
    (item) => Number(item.id) !== Number(marketplaceId)
  )
  renderCamposMargemMarketplaces()
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

function obterProdutoSelecionado() {
  return produtosCache.find((item) => item.id === Number(produtoSelecionadoId)) || null
}

function abrirSimulacao() {
  if (!obterProdutoSelecionado()) {
    return
  }

  simulacaoAberta = true
  renderConsultaRapida()
}

function fecharSimulacao() {
  simulacaoAberta = false
  renderConsultaRapida()
}

function selecionarProdutoParaConsulta(produtoId) {
  produtoSelecionadoId = Number(produtoId)
  simulacaoAberta = false
  renderConsultaRapida()
}

function renderConsultaRapida() {
  const titulo = document.getElementById('consulta-produto-titulo')
  const vazio = document.getElementById('consulta-vazia')
  const conteudo = document.getElementById('consulta-conteudo')
  const tabelaConsulta = document.getElementById('consulta-marketplaces')
  const painelSimulacao = document.getElementById('painel-simulacao')
  const tabelaSimulacao = document.getElementById('simulacao-marketplaces')
  const botaoAbrir = document.getElementById('abrir-simulacao')
  const produto = obterProdutoSelecionado()

  if (!produto) {
    titulo.textContent = 'Selecione um produto na tabela para consultar os precos por marketplace.'
    vazio.classList.remove('hidden')
    conteudo.classList.add('hidden')
    painelSimulacao.classList.add('hidden')
    tabelaConsulta.innerHTML = ''
    tabelaSimulacao.innerHTML = ''
    botaoAbrir.disabled = true
    return
  }

  botaoAbrir.disabled = !produto.marketplaces.length
  titulo.textContent = `${produto.nome} | Custo ${formatarMoeda(produto.custo)} | Venda direta ${formatarMoeda(produto.preco_venda)}`
  vazio.classList.add('hidden')
  conteudo.classList.remove('hidden')

  if (!produto.marketplaces.length) {
    tabelaConsulta.innerHTML = `
      <tr>
        <td colspan="4"><span class="text-soft">Esse produto ainda nao possui marketplaces vinculados.</span></td>
      </tr>
    `
    painelSimulacao.classList.add('hidden')
    tabelaSimulacao.innerHTML = ''
    return
  }

  tabelaConsulta.innerHTML = ordenarMarketplaces(produto.marketplaces)
    .map((marketplace) => {
      const concorrenteKey = getConcorrenteKey(produto.id, marketplace.id)
      const valorConcorrente = concorrenteInputs.get(concorrenteKey) || ''
      const analise = marketplace.taxa_configurada
        ? calcularResultadoConcorrente(produto.custo, valorConcorrente, marketplace)
        : null
      const lucroConcorrente = !marketplace.taxa_configurada
        ? '<span class="text-soft">Sem taxa configurada</span>'
        : !analise.possuiValor
          ? '<span class="text-soft">Informe um preco</span>'
          : `<span class="${analise.prejuizo ? 'text-danger' : 'text-success'}">${formatarMoeda(analise.lucro)}</span>`
      const margemConcorrente = !marketplace.taxa_configurada
        ? '<span class="text-soft">-</span>'
        : !analise.possuiValor
          ? '<span class="text-soft">-</span>'
          : `<span class="${analise.prejuizo ? 'text-danger' : 'text-success'}">${formatarPercentual(analise.margem)}</span>`

      return `
        <tr class="${analise?.prejuizo ? 'marketplace-loss-row' : ''}">
          <td>${marketplace.nome}</td>
          <td>${formatarMoeda(marketplace.preco_calculado)}</td>
          <td>${formatarPercentual(marketplace.margem_real || marketplace.margem || 0)}</td>
          <td>
            <input
              type="number"
              step="0.01"
              min="0"
              value="${valorConcorrente}"
              placeholder="Ex.: 24.90"
              data-competitor-product-id="${produto.id}"
              data-competitor-marketplace-id="${marketplace.id}"
              ${marketplace.taxa_configurada ? '' : 'disabled'}
            >
          </td>
          <td>${lucroConcorrente}</td>
          <td>${margemConcorrente}</td>
          <td>${getStatusBadge(marketplace)}</td>
        </tr>
      `
    })
    .join('')

  if (!simulacaoAberta) {
    painelSimulacao.classList.add('hidden')
    tabelaSimulacao.innerHTML = ''
    return
  }

  painelSimulacao.classList.remove('hidden')
  tabelaSimulacao.innerHTML = ordenarMarketplaces(produto.marketplaces)
    .map((marketplace) => {
      const resultado = marketplace.taxa_configurada
        ? calcularPrecoSimulado(produto.custo, marketplace.margem, marketplace)
        : null
      const statusResultado = !marketplace.taxa_configurada
        ? '<span class="text-soft">Sem taxa configurada</span>'
        : resultado.erro
          ? `<span class="text-danger">${resultado.erro}</span>`
          : formatarMoeda(resultado.preco_sugerido)

      const margemResultado = !marketplace.taxa_configurada
        ? '<span class="text-soft">-</span>'
        : resultado.erro
          ? '<span class="text-danger">Invalida</span>'
          : formatarPercentual(resultado.margem_real)

      return `
        <tr data-sim-row-id="${marketplace.id}">
          <td>${marketplace.nome}</td>
          <td>
            <input
              type="number"
              step="0.01"
              value="${formatarPercentualParaInput(marketplace.taxa_percentual)}"
              data-sim-field="taxa_percentual"
              data-sim-marketplace-id="${marketplace.id}"
              ${marketplace.taxa_configurada ? '' : 'disabled'}
            >
          </td>
          <td>
            <input
              type="number"
              step="0.01"
              value="${Number(marketplace.frete_medio || 0).toFixed(2)}"
              data-sim-field="frete_medio"
              data-sim-marketplace-id="${marketplace.id}"
              ${marketplace.taxa_configurada ? '' : 'disabled'}
            >
          </td>
          <td>
            <input
              type="number"
              step="0.01"
              value="${formatarPercentualParaInput(marketplace.indice_extra_percentual)}"
              data-sim-field="indice_extra_percentual"
              data-sim-marketplace-id="${marketplace.id}"
              ${marketplace.taxa_configurada ? '' : 'disabled'}
            >
          </td>
          <td>
            <input
              type="number"
              step="0.01"
              value="${formatarPercentualParaInput(marketplace.imposto_percentual)}"
              data-sim-field="imposto_percentual"
              data-sim-marketplace-id="${marketplace.id}"
              ${marketplace.taxa_configurada ? '' : 'disabled'}
            >
          </td>
          <td data-sim-price-id="${marketplace.id}">${statusResultado}</td>
          <td data-sim-margin-id="${marketplace.id}">${margemResultado}</td>
        </tr>
      `
    })
    .join('')
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

    if (Number(produtoSelecionadoId) === Number(id)) {
      produtoSelecionadoId = null
      simulacaoAberta = false
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
  selectedMarketplacesState = (produto.marketplaces || []).map((marketplace) => ({
    id: Number(marketplace.id),
    margem: marketplace.margem
  }))

  renderCamposMargemMarketplaces()

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
      if (buscaAtual || produtoSelecionadoId) {
        renderConsultaRapida()
      }
      criarPaginacao(dados.totalPages)
      return
    }

    dados.produtos.forEach((produto) => {
      tabela.innerHTML += `
        <tr
          class="${produtosDestacados.has(Number(produto.id)) ? 'row-highlight' : ''} ${Number(produtoSelecionadoId) === Number(produto.id) ? 'row-selected' : ''}"
          data-product-row-id="${produto.id}"
        >
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

    if (produtoSelecionadoId && !produtosCache.some((item) => Number(item.id) === Number(produtoSelecionadoId))) {
      produtoSelecionadoId = null
      simulacaoAberta = false
    }

    renderConsultaRapida()
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
  selectedMarketplacesState = []

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

function handleSelecaoProdutoTabela(event) {
  const elementoInterativo = event.target.closest('button, input, select, textarea, a')

  if (elementoInterativo) {
    return
  }

  const row = event.target.closest('[data-product-row-id]')

  if (!row) {
    return
  }

  selecionarProdutoParaConsulta(Number(row.dataset.productRowId))
}

function handleSimulacaoInput(event) {
  const input = event.target

  if (!input.matches('[data-sim-field][data-sim-marketplace-id]')) {
    return
  }

  const produto = obterProdutoSelecionado()

  if (!produto) {
    return
  }

  const marketplaceId = Number(input.dataset.simMarketplaceId)
  const marketplace = (produto.marketplaces || []).find((item) => item.id === marketplaceId)

  if (!marketplace || !marketplace.taxa_configurada) {
    return
  }

  const row = input.closest('[data-sim-row-id]')

  if (!row) {
    return
  }

  const taxa = {
    taxa_percentual: row.querySelector('[data-sim-field="taxa_percentual"]')?.value || 0,
    taxa_fixa: marketplace.taxa_fixa || 0,
    frete_medio: row.querySelector('[data-sim-field="frete_medio"]')?.value || 0,
    indice_extra_percentual:
      row.querySelector('[data-sim-field="indice_extra_percentual"]')?.value || 0,
    imposto_percentual: row.querySelector('[data-sim-field="imposto_percentual"]')?.value || 0
  }

  const resultado = calcularPrecoSimulado(produto.custo, marketplace.margem, taxa)
  const precoCell = row.querySelector(`[data-sim-price-id="${marketplaceId}"]`)
  const margemCell = row.querySelector(`[data-sim-margin-id="${marketplaceId}"]`)

  if (resultado.erro) {
    precoCell.innerHTML = `<span class="text-danger">${resultado.erro}</span>`
    margemCell.innerHTML = '<span class="text-danger">Invalida</span>'
    return
  }

  precoCell.textContent = formatarMoeda(resultado.preco_sugerido)
  margemCell.textContent = formatarPercentual(resultado.margem_real)
}

function handleConcorrenteInput(event) {
  const input = event.target

  if (!input.matches('[data-competitor-product-id][data-competitor-marketplace-id]')) {
    return
  }

  const produtoId = Number(input.dataset.competitorProductId)
  const marketplaceId = Number(input.dataset.competitorMarketplaceId)
  const key = getConcorrenteKey(produtoId, marketplaceId)

  if (input.value.trim()) {
    concorrenteInputs.set(key, input.value)
  } else {
    concorrenteInputs.delete(key)
  }

  const produtoSelecionado = obterProdutoSelecionado()

  if (produtoSelecionado && Number(produtoSelecionado.id) === produtoId) {
    renderConsultaRapida()
  }
}

document
  .getElementById('busca-produto')
  .addEventListener('input', function () {
    const valor = this.value

    if (buscaProdutosTimer) {
      clearTimeout(buscaProdutosTimer)
    }

    buscaProdutosTimer = window.setTimeout(() => {
      buscaAtual = valor
      paginaAtual = 1
      carregarProdutos(paginaAtual, buscaAtual)
    }, 250)
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
document.getElementById('abrir-simulacao').addEventListener('click', abrirSimulacao)
document.getElementById('fechar-simulacao').addEventListener('click', fecharSimulacao)
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
document.getElementById('tabela-produtos').addEventListener('click', handleSelecaoProdutoTabela)
document.getElementById('consulta-marketplaces').addEventListener('input', handleConcorrenteInput)
document.getElementById('simulacao-marketplaces').addEventListener('input', handleSimulacaoInput)

Promise.all([loadMarketplaces(), carregarProdutos()]).catch((error) => {
  setFeedback(error.message, 'text-danger')
})
