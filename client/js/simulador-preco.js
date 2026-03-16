let simuladorPaginaAtual = 1
let simuladorBuscaAtual = ''
let simuladorBuscaTimer = null
let simuladorProdutosCache = []
let simuladorProdutoSelecionadoId = null

function setSimuladorFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('simulador-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function setResultadoFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('simulador-resultado-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
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

function calcularIndicadoresPorPreco(custo, taxa, precoFinal) {
  const custoBase = normalizarValorMonetarioInput(custo)
  const preco = normalizarValorMonetarioInput(precoFinal)
  const taxaPercentual = normalizarPercentualInput(taxa.taxa_percentual)
  const taxaFixa = normalizarValorMonetarioInput(taxa.taxa_fixa)
  const freteMedio = normalizarValorMonetarioInput(taxa.frete_medio)
  const indiceExtra = normalizarPercentualInput(taxa.indice_extra_percentual)
  const imposto = normalizarPercentualInput(taxa.imposto_percentual)
  const valorTaxa = preco * taxaPercentual
  const valorIndiceExtra = preco * indiceExtra
  const valorImposto = preco * imposto
  const lucro = preco - custoBase - freteMedio - taxaFixa - valorTaxa - valorIndiceExtra - valorImposto

  return {
    preco_sugerido: Number(preco.toFixed(2)),
    lucro_estimado: Number(lucro.toFixed(2)),
    margem_real: preco > 0 ? Number((lucro / preco).toFixed(4)) : 0
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
  const divisorMargem = 1 - taxaPercentual - indiceExtra - imposto - margemDesejada

  if (divisorMargem <= 0) {
    return {
      erro: 'Percentuais e margem somam 100% ou mais'
    }
  }

  const preco = (custoBase + freteMedio + taxaFixa) / divisorMargem
  return {
    ...calcularIndicadoresPorPreco(custoBase, taxa, preco),
    erro: ''
  }
}

function getProdutoSelecionado() {
  return simuladorProdutosCache.find((produto) => Number(produto.id) === Number(simuladorProdutoSelecionadoId)) || null
}

function criarPaginacao(totalPages) {
  const paginacao = document.getElementById('simulador-paginacao')
  paginacao.innerHTML = ''

  for (let pagina = 1; pagina <= totalPages; pagina += 1) {
    paginacao.innerHTML += `<button type="button" onclick="irParaPaginaSimulador(${pagina})">${pagina}</button>`
  }
}

window.irParaPaginaSimulador = function irParaPaginaSimulador(pagina) {
  simuladorPaginaAtual = pagina
  carregarProdutosSimulador()
}

window.selecionarProdutoSimulador = function selecionarProdutoSimulador(produtoId) {
  simuladorProdutoSelecionadoId = Number(produtoId)
  document.querySelectorAll('[data-sim-produto-id]').forEach((row) => {
    row.classList.toggle('row-selected', Number(row.dataset.simProdutoId) === simuladorProdutoSelecionadoId)
  })
  renderResumoProduto()
}

function preencherSelectMarketplaces(produto) {
  const select = document.getElementById('sim-marketplace')
  const marketplaces = Array.isArray(produto?.marketplaces) ? produto.marketplaces : []

  if (!marketplaces.length) {
    select.innerHTML = '<option value="">Sem marketplaces</option>'
    return
  }

  select.innerHTML = marketplaces
    .map((marketplace) => `<option value="${marketplace.id}">${marketplace.nome}</option>`)
    .join('')
}

function preencherCamposCenario() {
  const produto = getProdutoSelecionado()
  const marketplaceId = Number(document.getElementById('sim-marketplace').value)
  const marketplace = (produto?.marketplaces || []).find((item) => Number(item.id) === marketplaceId)

  if (!produto || !marketplace) {
    return
  }

  document.getElementById('sim-custo').value = produto.custo || 0
  document.getElementById('sim-margem').value = marketplace.margem || produto.margem_desejada || 0
  document.getElementById('sim-taxa-percentual').value = marketplace.taxa_percentual || 0
  document.getElementById('sim-taxa-fixa').value = marketplace.taxa_fixa || 0
  document.getElementById('sim-frete-medio').value = marketplace.frete_medio || 0
  document.getElementById('sim-indice-extra').value = marketplace.indice_extra_percentual || 0
  document.getElementById('sim-imposto').value = marketplace.imposto_percentual || 0
}

function renderResumoProduto() {
  const produto = getProdutoSelecionado()
  const titulo = document.getElementById('simulador-produto-titulo')
  const resumo = document.getElementById('simulador-produto-resumo')
  const vazio = document.getElementById('simulador-vazio')
  const conteudo = document.getElementById('simulador-conteudo')
  const tabela = document.getElementById('simulador-marketplaces-tabela')
  const cardCenario = document.getElementById('simulador-cenario-card')

  if (!produto) {
    titulo.textContent = 'Selecione um produto'
    resumo.textContent = 'A simulacao usa o mesmo conjunto de taxas e margens ja configurado para o produto.'
    vazio.classList.remove('hidden')
    conteudo.classList.add('hidden')
    cardCenario.classList.add('hidden')
    tabela.innerHTML = ''
    setResultadoFeedback('')
    return
  }

  titulo.textContent = produto.nome
  resumo.textContent = `Custo ${formatarMoeda(produto.custo)} | Preco direto ${formatarMoeda(produto.preco_venda)}`
  vazio.classList.add('hidden')
  conteudo.classList.remove('hidden')
  cardCenario.classList.remove('hidden')

  if (!Array.isArray(produto.marketplaces) || !produto.marketplaces.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4"><span class="text-soft">Esse produto ainda nao possui marketplaces vinculados.</span></td>
      </tr>
    `
    document.getElementById('sim-marketplace').innerHTML = '<option value="">Sem marketplaces</option>'
    return
  }

  tabela.innerHTML = produto.marketplaces
    .map((marketplace) => {
      const status = marketplace.status_label || (marketplace.taxa_configurada ? 'Calculado' : 'Sem taxa')

      return `
        <tr>
          <td>${marketplace.nome}</td>
          <td>${formatarMoeda(marketplace.preco_calculado)}</td>
          <td>${formatarPercentual(marketplace.margem_real || marketplace.margem || 0)}</td>
          <td>${status}</td>
        </tr>
      `
    })
    .join('')

  preencherSelectMarketplaces(produto)
  preencherCamposCenario()
  calcularCenario()
}

async function carregarProdutosSimulador() {
  try {
    const dados = await apiFetch(
      `/produtos?page=${simuladorPaginaAtual}&busca=${encodeURIComponent(simuladorBuscaAtual)}`
    )

    setSimuladorFeedback('')
    simuladorProdutosCache = Array.isArray(dados.produtos) ? dados.produtos : []
    const tabela = document.getElementById('simulador-produtos-tabela')

    if (!simuladorProdutosCache.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="4">Nenhum produto encontrado.</td>
        </tr>
      `
      criarPaginacao(dados.totalPages || 1)
      renderResumoProduto()
      return
    }

    tabela.innerHTML = simuladorProdutosCache
      .map((produto) => {
        const marketplaces = Array.isArray(produto.marketplaces) ? produto.marketplaces.length : 0
        const rowClass = Number(produto.id) === Number(simuladorProdutoSelecionadoId) ? 'row-selected' : ''

        return `
          <tr class="${rowClass}" data-sim-produto-id="${produto.id}" onclick="selecionarProdutoSimulador(${produto.id})">
            <td>${produto.nome}</td>
            <td>${formatarMoeda(produto.custo)}</td>
            <td>${formatarMoeda(produto.preco_venda)}</td>
            <td>${marketplaces}</td>
          </tr>
        `
      })
      .join('')

    if (
      simuladorProdutoSelecionadoId &&
      !simuladorProdutosCache.some((produto) => Number(produto.id) === Number(simuladorProdutoSelecionadoId))
    ) {
      simuladorProdutoSelecionadoId = null
    }

    criarPaginacao(dados.totalPages || 1)
    renderResumoProduto()
  } catch (error) {
    setSimuladorFeedback(error.message, 'text-danger')
  }
}

function calcularCenario() {
  const marketplaceId = Number(document.getElementById('sim-marketplace').value)
  const produto = getProdutoSelecionado()
  const marketplace = (produto?.marketplaces || []).find((item) => Number(item.id) === marketplaceId)

  if (!produto || !marketplace) {
    return
  }

  const taxa = {
    taxa_percentual: document.getElementById('sim-taxa-percentual').value,
    taxa_fixa: document.getElementById('sim-taxa-fixa').value,
    frete_medio: document.getElementById('sim-frete-medio').value,
    indice_extra_percentual: document.getElementById('sim-indice-extra').value,
    imposto_percentual: document.getElementById('sim-imposto').value
  }

  const resultado = calcularPrecoSimulado(
    document.getElementById('sim-custo').value,
    document.getElementById('sim-margem').value,
    taxa
  )

  if (resultado.erro) {
    document.getElementById('sim-resultado-preco').textContent = '--'
    document.getElementById('sim-resultado-lucro').textContent = '--'
    document.getElementById('sim-resultado-margem').textContent = '--'
    setResultadoFeedback(resultado.erro, 'text-danger')
    return
  }

  document.getElementById('sim-resultado-preco').textContent = formatarMoeda(resultado.preco_sugerido)
  document.getElementById('sim-resultado-lucro').textContent = formatarMoeda(resultado.lucro_estimado)
  document.getElementById('sim-resultado-margem').textContent = formatarPercentual(resultado.margem_real)
  setResultadoFeedback('Simulacao calculada sem alterar os dados reais do produto.', 'text-success')
}

document.getElementById('simulador-busca-produto').addEventListener('input', function () {
  const valor = this.value.trim()

  if (simuladorBuscaTimer) {
    clearTimeout(simuladorBuscaTimer)
  }

  simuladorBuscaTimer = window.setTimeout(() => {
    simuladorBuscaAtual = valor
    simuladorPaginaAtual = 1
    carregarProdutosSimulador()
  }, 250)
})

document.getElementById('simulador-atualizar-button').addEventListener('click', carregarProdutosSimulador)
document.getElementById('sim-marketplace').addEventListener('change', () => {
  preencherCamposCenario()
  calcularCenario()
})
document.getElementById('simulador-calcular-button').addEventListener('click', calcularCenario)

carregarProdutosSimulador()
