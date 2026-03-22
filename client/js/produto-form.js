const produtoFormState = {
  marketplacesCache: [],
  selectedMarketplaces: [],
  taxasPorMarketplace: new Map(),
  categoriasCache: [],
  produtoAtual: null,
  modoPrecoManual: false,
  ncmAutocompleteTimer: null
}
const FALLBACK_MARGEM_DIRETA = 0.3

function setFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('produtos-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function setButtonLoading(button, loading, labelIdle, labelLoading) {
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

function normalizarValorMonetarioInput(valor) {
  const numero = Number(String(valor || '').replace(',', '.'))
  return Number.isNaN(numero) || numero < 0 ? 0 : numero
}

function normalizarPercentualInput(valor) {
  const numero = Number(String(valor || '').replace(',', '.'))

  if (Number.isNaN(numero) || numero < 0) {
    return 0
  }

  return numero > 1 ? numero / 100 : numero
}

function obterProdutoIdDaUrl() {
  return new URLSearchParams(window.location.search).get('id')
}

function emModoEdicao() {
  return Boolean(obterProdutoIdDaUrl())
}

function atualizarTituloFormulario() {
  const titulo = document.getElementById('produto-form-titulo')
  const submitButton = document.getElementById('produto-submit-button')
  const editando = emModoEdicao()

  titulo.textContent = editando ? 'Editar Produto' : 'Novo Produto'
  submitButton.textContent = editando ? 'Atualizar Produto' : 'Salvar Produto'
  document.title = editando ? 'Editar Produto' : 'Novo Produto'
}

function calcularPrecoDireto(custo, margemDesejada) {
  const custoNumero = Number(custo || 0)
  const margemNumero = Number(margemDesejada || 0)

  if (!custoNumero || !margemNumero || margemNumero >= 1) {
    return ''
  }

  return (custoNumero / (1 - margemNumero)).toFixed(2)
}

function aplicarFallbackControladoPrecoDireto() {
  const custoInput = document.getElementById('custo')
  const precoVendaInput = document.getElementById('preco_venda')
  const margemInput = document.getElementById('margem_desejada')
  const custo = normalizarValorMonetarioInput(custoInput.value)
  const precoVenda = precoVendaInput.value.trim()
  const margem = margemInput.value.trim()

  if (precoVenda || margem || custo <= 0) {
    return false
  }

  margemInput.value = String(FALLBACK_MARGEM_DIRETA)
  produtoFormState.modoPrecoManual = false
  atualizarLogicaPrecoMargem('margem_desejada')
  setFeedback(
    'Fallback assistido aplicado: margem inicial de 30% na venda direta. Ajuste antes de salvar se necessário.',
    'text-success'
  )
  return true
}

function calcularIndicadoresPorPreco(custo, taxa, precoFinal) {
  const custoBase = normalizarValorMonetarioInput(custo)
  const preco = normalizarValorMonetarioInput(precoFinal)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)

  if (!preco) {
    return {
      preco_sugerido: 0,
      margem_real: 0,
      lucro_estimado: 0,
      erro: ''
    }
  }

  const valorTaxa = preco * taxaPercentual
  const valorIndiceExtra = preco * indiceExtra
  const valorImposto = preco * imposto
  const lucro = preco - custoBase - freteMedio - taxaFixa - valorTaxa - valorIndiceExtra - valorImposto

  return {
    preco_sugerido: Number(preco.toFixed(2)),
    margem_real: preco > 0 ? Number((lucro / preco).toFixed(4)) : 0,
    lucro_estimado: Number(lucro.toFixed(2)),
    erro: ''
  }
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
      lucro_estimado: 0,
      erro: 'Percentuais e margem somam 100% ou mais'
    }
  }

  const preco = (custoBase + freteMedio + taxaFixa) / divisorMargem
  return calcularIndicadoresPorPreco(custoBase, taxa, preco)
}

function calcularFaixaMinima(custo, taxa) {
  return calcularPrecoSimulado(custo, 0, taxa)
}

function getTaxaDoMarketplace(marketplaceId) {
  return produtoFormState.taxasPorMarketplace.get(Number(marketplaceId)) || null
}

function getMarketplaceById(marketplaceId) {
  return produtoFormState.marketplacesCache.find((item) => Number(item.id) === Number(marketplaceId))
}

function ensureMarketplaceInCache(marketplace) {
  if (!marketplace || !marketplace.id) {
    return
  }

  if (!getMarketplaceById(marketplace.id)) {
    produtoFormState.marketplacesCache.push({
      id: Number(marketplace.id),
      nome: marketplace.nome,
      slug: marketplace.slug
    })
  }
}

function obterMargemPadrao() {
  return document.getElementById('margem_desejada').value || '0'
}

function collectSelectedMarketplaces() {
  return Array.from(document.querySelectorAll('[data-marketplace-margin-id]')).map((input) => ({
    id: Number(input.dataset.marketplaceMarginId),
    margem: input.value || obterMargemPadrao()
  }))
}

function syncSelectedMarketplacesState() {
  const selecionados = collectSelectedMarketplaces()

  if (selecionados.length) {
    produtoFormState.selectedMarketplaces = selecionados
  }
}

function renderMarketplaceSelectOptions() {
  const select = document.getElementById('marketplace-select')
  const selectedIds = new Set(produtoFormState.selectedMarketplaces.map((item) => Number(item.id)))

  preencherSelectMarketplaces(
    select,
    produtoFormState.marketplacesCache.filter((marketplace) => !selectedIds.has(Number(marketplace.id))),
    'Selecione um marketplace'
  )
}

function obterEscopoCategoriaSelecionado() {
  const valor = document.getElementById('categoria_canal').value

  if (valor.startsWith('marketplace:')) {
    return {
      tipo_canal: 'marketplace',
      marketplace_id: Number(valor.split(':')[1])
    }
  }

  return {
    tipo_canal: valor || 'loja_virtual',
    marketplace_id: null
  }
}

function renderCategoriaCanalOptions(valorAtual = '') {
  const select = document.getElementById('categoria_canal')
  const canais = [
    { value: 'loja_virtual', label: 'Loja virtual' },
    { value: 'venda_direta', label: 'Venda direta' },
    ...produtoFormState.selectedMarketplaces
      .map((item) => getMarketplaceById(item.id))
      .filter(Boolean)
      .map((marketplace) => ({
        value: `marketplace:${marketplace.id}`,
        label: `Marketplace: ${marketplace.nome}`
      }))
  ]

  select.innerHTML = canais
    .map((canal) => `<option value="${canal.value}">${canal.label}</option>`)
    .join('')

  if (valorAtual && canais.some((canal) => canal.value === valorAtual)) {
    select.value = valorAtual
  } else if (!canais.some((canal) => canal.value === select.value)) {
    select.value = 'loja_virtual'
  }
}

async function carregarCategoriasDoCanal() {
  const { tipo_canal, marketplace_id } = obterEscopoCategoriaSelecionado()
  const params = new URLSearchParams({
    page: '1',
    limit: '200',
    tipo_canal
  })
  const categoriaAtualId = document.getElementById('categoria_id').value || produtoFormState.produtoAtual?.categoria_id

  if (categoriaAtualId) {
    params.set('include_inactive', 'true')
  }

  if (marketplace_id) {
    params.set('marketplace_id', String(marketplace_id))
  }

  const dados = await apiFetch(`/categorias?${params.toString()}`)
  produtoFormState.categoriasCache = Array.isArray(dados) ? dados : (dados.categorias || [])
  renderCategoriaOptions()
}

function renderCategoriaOptions(valorAtual = '') {
  const select = document.getElementById('categoria_id')
  const categoriaSelecionadaAtual = valorAtual || select.value

  select.innerHTML = '<option value="">Sem categoria</option>'

  produtoFormState.categoriasCache.forEach((categoria) => {
    const option = document.createElement('option')
    option.value = categoria.id
    option.textContent = categoria.nome
    select.appendChild(option)
  })

  if (
    categoriaSelecionadaAtual &&
    produtoFormState.categoriasCache.some((categoria) => Number(categoria.id) === Number(categoriaSelecionadaAtual))
  ) {
    select.value = categoriaSelecionadaAtual
  }
}

async function atualizarCategoriasPorCanal(valorAtualCategoria = '') {
  const canalAtual = document.getElementById('categoria_canal').value
  renderCategoriaCanalOptions(canalAtual)
  await carregarCategoriasDoCanal()

  if (valorAtualCategoria) {
    renderCategoriaOptions(valorAtualCategoria)
  }
}

function atualizarLogicaPrecoMargem(origem = '') {
  const custoInput = document.getElementById('custo')
  const precoVendaInput = document.getElementById('preco_venda')
  const margemInput = document.getElementById('margem_desejada')
  const custo = custoInput.value.trim()
  const precoVenda = precoVendaInput.value.trim()
  const margem = margemInput.value.trim()

  if (origem === 'preco_venda') {
    produtoFormState.modoPrecoManual = Boolean(precoVenda)
  } else if (origem === 'margem_desejada') {
    produtoFormState.modoPrecoManual = false
  }

  if (produtoFormState.modoPrecoManual && precoVenda) {
    margemInput.disabled = true
    precoVendaInput.readOnly = false
    return
  }

  margemInput.disabled = false

  if (margem) {
    precoVendaInput.value = calcularPrecoDireto(custo, normalizarPercentualInput(margem))
    precoVendaInput.readOnly = true
    return
  }

  precoVendaInput.readOnly = false
}

function renderCamposMargemMarketplaces() {
  const container = document.getElementById('marketplaces-margens')
  const custoAtual = document.getElementById('custo').value || 0
  const precoVendaAtual = document.getElementById('preco_venda').value || 0
  container.innerHTML = ''

  if (!produtoFormState.selectedMarketplaces.length) {
    container.innerHTML = `
      <tr>
        <td colspan="4"><span class="text-soft">Adicione marketplaces para definir margens especificas.</span></td>
      </tr>
    `
    renderMarketplaceSelectOptions()
    renderCategoriaCanalOptions(document.getElementById('categoria_canal').value)
    return
  }

  produtoFormState.selectedMarketplaces.forEach((selecionado) => {
    const marketplace = getMarketplaceById(selecionado.id)

    if (!marketplace) {
      return
    }

    const taxa = getTaxaDoMarketplace(selecionado.id)
    const margemAplicada = selecionado.margem ?? obterMargemPadrao()
    const calculado = !taxa
      ? null
      : produtoFormState.modoPrecoManual && precoVendaAtual
        ? calcularIndicadoresPorPreco(custoAtual, taxa, precoVendaAtual)
        : calcularPrecoSimulado(custoAtual, margemAplicada, taxa)
    const faixaMinima = taxa ? calcularFaixaMinima(custoAtual, taxa) : null
    const cardIndicadores = !taxa
      ? '<span class="text-soft">Configure as taxas deste marketplace para ver a precificacao.</span>'
      : calculado.erro
        ? `<span class="text-danger">${calculado.erro}</span>`
        : `
          <div class="inline-marketplace-card">
            <div>${formatarMoeda(calculado.preco_sugerido)} | lucro ${formatarMoeda(calculado.lucro_estimado)}</div>
            <div>Margem real ${formatarPercentual(calculado.margem_real)}</div>
            <div>${formatarMoeda(faixaMinima.preco_sugerido)} -> ${formatarMoeda(calculado.preco_sugerido)}</div>
          </div>
        `

    container.innerHTML += `
      <tr>
        <td>${marketplace.nome}</td>
        <td>
          <input
            type="number"
            step="0.0001"
            value="${margemAplicada}"
            data-marketplace-margin-id="${marketplace.id}"
          >
        </td>
        <td>${cardIndicadores}</td>
        <td>
          <button type="button" class="button-danger" onclick="removerMarketplaceSelecionado(${marketplace.id})">
            Remover
          </button>
        </td>
      </tr>
    `
  })

  renderMarketplaceSelectOptions()
  renderCategoriaCanalOptions(document.getElementById('categoria_canal').value)
}

async function carregarMarketplaces() {
  produtoFormState.marketplacesCache = await carregarMarketplacesAtivos()
  renderMarketplaceSelectOptions()
}

async function loadTaxas() {
  const dados = await apiFetch('/taxas')
  produtoFormState.taxasPorMarketplace = new Map(
    (dados.taxas || []).map((taxa) => [Number(taxa.marketplace_id), taxa])
  )
}

function esconderSugestoesNcm() {
  const container = document.getElementById('ncm-sugestoes')
  container.classList.add('hidden')
  container.innerHTML = ''
}

function renderSugestoesNcm(itens) {
  const container = document.getElementById('ncm-sugestoes')

  if (!itens.length) {
    esconderSugestoesNcm()
    return
  }

  container.innerHTML = itens
    .map(
      (item) => `
        <button type="button" class="autocomplete-item" data-ncm-codigo="${item.codigo}">
          <strong>${item.codigo}</strong>
          <span>${item.descricao}</span>
        </button>
      `
    )
    .join('')

  container.classList.remove('hidden')
}

async function buscarSugestoesNcm(query) {
  if (query.trim().length < 2) {
    esconderSugestoesNcm()
    return
  }

  try {
    const dados = await apiFetch(`/ncm/sugestoes?q=${encodeURIComponent(query)}`)
    renderSugestoesNcm(dados.ncm || [])
  } catch (error) {
    esconderSugestoesNcm()
  }
}

async function gerarSkuAutomatico() {
  const botao = document.getElementById('gerar-sku-button')
  setButtonLoading(botao, true, 'Gerar SKU', 'Gerando...')

  try {
    const dados = await apiFetch('/produtos/sugerir-sku')
    document.getElementById('sku').value = dados.sku || ''
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  } finally {
    setButtonLoading(botao, false, 'Gerar SKU', 'Gerando...')
  }
}

async function preencherFormulario(produto) {
  produtoFormState.produtoAtual = produto
  document.getElementById('produto-id').value = produto.id
  document.getElementById('nome').value = produto.nome || ''
  document.getElementById('sku').value = produto.sku || ''
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

  produtoFormState.selectedMarketplaces = (produto.marketplaces || []).map((marketplace) => {
    ensureMarketplaceInCache(marketplace)
    return {
      id: Number(marketplace.id),
      margem: marketplace.margem ?? produto.margem_desejada ?? '0'
    }
  })

  renderCamposMargemMarketplaces()

  const valorCanalCategoria = produto.categoria_marketplace_id
    ? `marketplace:${produto.categoria_marketplace_id}`
    : (produto.categoria_tipo_canal || 'loja_virtual')

  renderCategoriaCanalOptions(valorCanalCategoria)
  document.getElementById('categoria_canal').value = valorCanalCategoria
  try {
    await carregarCategoriasDoCanal()
    renderCategoriaOptions(produto.categoria_id || '')
  } catch (error) {
    console.error('Erro ao carregar categorias do produto em edicao:', error)
  }

  produtoFormState.modoPrecoManual = Number(produto.margem_desejada || 0) === 0 && Boolean(produto.preco_venda)
  atualizarLogicaPrecoMargem(produtoFormState.modoPrecoManual ? 'preco_venda' : 'margem_desejada')
}

async function carregarProdutoEdicao() {
  const produtoId = obterProdutoIdDaUrl()

  if (!produtoId) {
    return
  }

  const dados = await apiFetch(`/produtos/${produtoId}`)
  const produto = dados?.produto || dados

  if (!produto || !produto.id) {
    throw new Error('Produto nao encontrado para edicao')
  }

  await preencherFormulario(produto)
}

function montarPayloadProduto() {
  return {
    nome: document.getElementById('nome').value.trim(),
    sku: document.getElementById('sku').value.trim(),
    categoria_id: document.getElementById('categoria_id').value,
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
    marketplaces: collectSelectedMarketplaces()
  }
}

async function salvarProduto() {
  const produtoId = document.getElementById('produto-id').value
  const submitButton = document.getElementById('produto-submit-button')

  aplicarFallbackControladoPrecoDireto()

  setButtonLoading(
    submitButton,
    true,
    produtoId ? 'Atualizar Produto' : 'Salvar Produto',
    'Salvando...'
  )

  try {
    await apiFetch(produtoId ? `/produtos/${produtoId}` : '/produtos', {
      method: produtoId ? 'PUT' : 'POST',
      body: JSON.stringify(montarPayloadProduto())
    })

    window.location.href = '/produtos-cadastrados.html'
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  } finally {
    setButtonLoading(
      submitButton,
      false,
      produtoId ? 'Atualizar Produto' : 'Salvar Produto',
      'Salvando...'
    )
  }
}

async function adicionarMarketplaceSelecionado() {
  syncSelectedMarketplacesState()
  const marketplaceId = Number(document.getElementById('marketplace-select').value)

  if (!Number.isInteger(marketplaceId) || marketplaceId <= 0) {
    setFeedback('Selecione um marketplace para adicionar.', 'text-danger')
    return
  }

  if (produtoFormState.selectedMarketplaces.some((item) => Number(item.id) === marketplaceId)) {
    setFeedback('Esse marketplace ja foi adicionado.', 'text-danger')
    return
  }

  produtoFormState.selectedMarketplaces.push({
    id: marketplaceId,
    margem: obterMargemPadrao()
  })

  renderCamposMargemMarketplaces()
  await atualizarCategoriasPorCanal(document.getElementById('categoria_id').value)
  setFeedback('')
}

window.removerMarketplaceSelecionado = async function removerMarketplaceSelecionado(marketplaceId) {
  syncSelectedMarketplacesState()
  produtoFormState.selectedMarketplaces = produtoFormState.selectedMarketplaces.filter(
    (item) => Number(item.id) !== Number(marketplaceId)
  )

  renderCamposMargemMarketplaces()
  await atualizarCategoriasPorCanal()
}

function configurarEventosFormulario() {
  document.getElementById('adicionar-marketplace-button').addEventListener('click', adicionarMarketplaceSelecionado)
  document.getElementById('gerar-sku-button').addEventListener('click', gerarSkuAutomatico)
  document.getElementById('produto-submit-button').addEventListener('click', salvarProduto)
  document.getElementById('custo').addEventListener('input', () => {
    atualizarLogicaPrecoMargem()
    syncSelectedMarketplacesState()
    renderCamposMargemMarketplaces()
  })
  document.getElementById('preco_venda').addEventListener('input', () => {
    atualizarLogicaPrecoMargem('preco_venda')
    syncSelectedMarketplacesState()
    renderCamposMargemMarketplaces()
  })
  document.getElementById('margem_desejada').addEventListener('input', () => {
    atualizarLogicaPrecoMargem('margem_desejada')
    syncSelectedMarketplacesState()
    renderCamposMargemMarketplaces()
  })
  document.getElementById('marketplaces-margens').addEventListener('input', (event) => {
    if (!event.target.matches('[data-marketplace-margin-id]')) {
      return
    }

    syncSelectedMarketplacesState()
    renderCamposMargemMarketplaces()
  })
  document.getElementById('categoria_canal').addEventListener('change', async () => {
    await carregarCategoriasDoCanal()
  })
  document.getElementById('ncm').addEventListener('input', function () {
    if (produtoFormState.ncmAutocompleteTimer) {
      clearTimeout(produtoFormState.ncmAutocompleteTimer)
    }

    produtoFormState.ncmAutocompleteTimer = window.setTimeout(() => {
      buscarSugestoesNcm(this.value)
    }, 200)
  })
  document.getElementById('ncm').addEventListener('blur', () => {
    window.setTimeout(esconderSugestoesNcm, 150)
  })
  document.getElementById('ncm').addEventListener('focus', function () {
    if (this.value.trim().length >= 2) {
      buscarSugestoesNcm(this.value)
    }
  })
  document.getElementById('ncm-sugestoes').addEventListener('click', (event) => {
    const botao = event.target.closest('[data-ncm-codigo]')

    if (!botao) {
      return
    }

    document.getElementById('ncm').value = botao.dataset.ncmCodigo || ''
    esconderSugestoesNcm()
  })
}

async function initFormularioProduto() {
  atualizarTituloFormulario()
  configurarEventosFormulario()

  try {
    await Promise.allSettled([loadTaxas(), carregarMarketplaces()])
    renderMarketplaceSelectOptions()
    renderCategoriaCanalOptions()

    try {
      await carregarCategoriasDoCanal()
    } catch (error) {
      console.error('Erro ao carregar categorias iniciais:', error)
    }

    await carregarProdutoEdicao()
    atualizarLogicaPrecoMargem()
    renderCamposMargemMarketplaces()
  } catch (error) {
    console.error('Erro ao inicializar formulario de produto:', error)
    setFeedback(error.message, 'text-danger')
  }
}

document.addEventListener('DOMContentLoaded', initFormularioProduto)
