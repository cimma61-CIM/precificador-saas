let xmlArquivoSelecionado = null
let xmlAnaliseAtual = null
let produtosDisponiveis = []

function setXmlFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('xml-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('token')

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders
  }
}

async function apiFileFetch(url, options = {}) {
  const resposta = await fetch(url, {
    ...options,
    headers: getAuthHeaders(options.headers || {})
  })

  if (resposta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/login.html'
    throw new Error('Sessao expirada')
  }

  if (!resposta.ok) {
    const contentType = resposta.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const dadosErro = await resposta.json()
      throw new Error(dadosErro.erro || 'Erro na requisicao')
    }

    throw new Error((await resposta.text()) || 'Erro na requisicao')
  }

  return resposta.json()
}

function buildXmlFormData() {
  if (!xmlArquivoSelecionado) {
    throw new Error('Selecione um arquivo XML antes de continuar')
  }

  const formData = new FormData()
  formData.append('arquivo', xmlArquivoSelecionado)
  return formData
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function formatarData(valor) {
  if (!valor) {
    return '-'
  }

  const data = new Date(valor)
  return Number.isNaN(data.getTime())
    ? valor
    : new Intl.DateTimeFormat('pt-BR').format(data)
}

function getProdutoOptions(selectedValue = '') {
  const options = ['<option value="">Selecione um produto</option>']

  produtosDisponiveis.forEach((produto) => {
    const selected = Number(selectedValue) === Number(produto.id) ? 'selected' : ''
    options.push(
      `<option value="${produto.id}" ${selected}>${produto.nome} (${produto.sku || 'Sem SKU'})</option>`
    )
  })

  return options.join('')
}

function updateConfirmButtonState() {
  const button = document.getElementById('xml-confirmar-button')
  const pendentes = xmlAnaliseAtual?.itens_nao_identificados || []
  button.disabled = !xmlArquivoSelecionado || !xmlAnaliseAtual || pendentes.length > 0
}

function renderResumo() {
  if (!xmlAnaliseAtual) {
    document.getElementById('xml-resumo-card').classList.add('hidden')
    return
  }

  document.getElementById('xml-fornecedor').textContent = xmlAnaliseAtual.fornecedor || '-'
  document.getElementById('xml-data').textContent = formatarData(xmlAnaliseAtual.data)
  document.getElementById('xml-identificados-total').textContent = xmlAnaliseAtual.itens_identificados?.length || 0
  document.getElementById('xml-nao-identificados-total').textContent = xmlAnaliseAtual.itens_nao_identificados?.length || 0
  document.getElementById('xml-resumo-card').classList.remove('hidden')
}

function renderItensIdentificados() {
  const card = document.getElementById('xml-identificados-card')
  const tabela = document.getElementById('xml-identificados-tabela')
  const itens = xmlAnaliseAtual?.itens_identificados || []

  if (!xmlAnaliseAtual) {
    card.classList.add('hidden')
    return
  }

  card.classList.remove('hidden')

  if (!itens.length) {
    tabela.innerHTML = '<tr><td colspan="3">Nenhum item identificado.</td></tr>'
    return
  }

  tabela.innerHTML = itens.map((item) => `
    <tr>
      <td>${item.nome}</td>
      <td><span class="pill">${item.codigo_fornecedor || '-'}</span></td>
      <td>${item.produto_nome} ${item.produto_sku ? `<span class="text-soft">(${item.produto_sku})</span>` : ''}</td>
    </tr>
  `).join('')
}

function renderItensNaoIdentificados() {
  const card = document.getElementById('xml-nao-identificados-card')
  const tabela = document.getElementById('xml-nao-identificados-tabela')
  const itens = xmlAnaliseAtual?.itens_nao_identificados || []

  if (!xmlAnaliseAtual) {
    card.classList.add('hidden')
    return
  }

  card.classList.remove('hidden')

  if (!itens.length) {
    tabela.innerHTML = '<tr><td colspan="6">Nenhum item pendente.</td></tr>'
    return
  }

  tabela.innerHTML = itens.map((item, index) => `
    <tr class="xml-pending-row">
      <td>${item.nome}</td>
      <td><span class="pill">${item.codigo_fornecedor || '-'}</span></td>
      <td>${item.quantidade}</td>
      <td>${formatarMoeda(item.custo_unitario)}</td>
      <td>
        <select class="xml-produto-select" data-index="${index}">
          ${getProdutoOptions(item.produto_id)}
        </select>
      </td>
      <td>
        <div class="table-actions">
          <button type="button" class="button-primary" onclick="salvarVinculoXml(${index})">Vincular</button>
        </div>
      </td>
    </tr>
  `).join('')
}

function renderAnalise() {
  renderResumo()
  renderItensIdentificados()
  renderItensNaoIdentificados()
  updateConfirmButtonState()
}

async function carregarProdutos() {
  const resposta = await apiFetch('/produtos?page=1&limit=200')
  produtosDisponiveis = Array.isArray(resposta.produtos) ? resposta.produtos : []
}

async function analisarXml() {
  const button = document.getElementById('xml-analisar-button')
  button.disabled = true
  button.textContent = 'Analisando...'

  try {
    const resultado = await apiFileFetch('/produtos/importar', {
      method: 'POST',
      body: buildXmlFormData()
    })

    if (resultado.tipo_importacao !== 'xml_compra') {
      throw new Error('O arquivo enviado nao retornou uma analise de XML')
    }

    xmlAnaliseAtual = resultado
    renderAnalise()
    setXmlFeedback('Analise do XML concluida.', resultado.itens_nao_identificados?.length ? 'text-danger' : 'text-success')
  } catch (error) {
    xmlAnaliseAtual = null
    renderAnalise()
    setXmlFeedback(error.message, 'text-danger')
  } finally {
    button.disabled = false
    button.textContent = 'Analisar XML'
  }
}

window.salvarVinculoXml = async function salvarVinculoXml(index) {
  const item = xmlAnaliseAtual?.itens_nao_identificados?.[index]
  const select = document.querySelector(`.xml-produto-select[data-index="${index}"]`)
  const produtoId = Number(select?.value)

  if (!item) {
    return
  }

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    setXmlFeedback('Selecione um produto antes de salvar o vinculo.', 'text-danger')
    return
  }

  try {
    await apiFetch('/produto-fornecedor', {
      method: 'POST',
      body: JSON.stringify({
        produto_id: produtoId,
        fornecedor: item.fornecedor,
        codigo_fornecedor: item.codigo_fornecedor
      })
    })

    const produto = produtosDisponiveis.find((entry) => Number(entry.id) === produtoId)
    const itemIdentificado = {
      ...item,
      produto_id: produtoId,
      produto_nome: produto?.nome || 'Produto vinculado',
      produto_sku: produto?.sku || ''
    }

    xmlAnaliseAtual.itens_nao_identificados.splice(index, 1)
    xmlAnaliseAtual.itens_identificados.push(itemIdentificado)
    renderAnalise()
    setXmlFeedback('Vinculo salvo com sucesso.', 'text-success')
  } catch (error) {
    setXmlFeedback(error.message, 'text-danger')
  }
}

async function confirmarImportacaoXml() {
  const button = document.getElementById('xml-confirmar-button')
  button.disabled = true
  button.textContent = 'Importando...'

  try {
    const resultado = await apiFileFetch('/compras/importar-xml-confirmado', {
      method: 'POST',
      body: buildXmlFormData()
    })

    setXmlFeedback(
      resultado.itens_nao_identificados?.length
        ? 'Importacao concluida com pendencias.'
        : 'Importacao XML concluida com sucesso.',
      resultado.itens_nao_identificados?.length ? 'text-danger' : 'text-success'
    )

    xmlAnaliseAtual = resultado
    renderAnalise()
  } catch (error) {
    setXmlFeedback(error.message, 'text-danger')
  } finally {
    button.textContent = 'Confirmar importacao'
    updateConfirmButtonState()
  }
}

async function initXmlConferencia() {
  try {
    await carregarProdutos()
    updateConfirmButtonState()
  } catch (error) {
    setXmlFeedback(error.message, 'text-danger')
  }
}

document.getElementById('xml-arquivo').addEventListener('change', function () {
  xmlArquivoSelecionado = this.files[0] || null
  xmlAnaliseAtual = null
  renderAnalise()
  setXmlFeedback('')
})

document.getElementById('xml-analisar-button').addEventListener('click', analisarXml)
document.getElementById('xml-confirmar-button').addEventListener('click', confirmarImportacaoXml)

document.addEventListener('DOMContentLoaded', initXmlConferencia)
