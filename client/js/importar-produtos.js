let arquivoSelecionado = null

function setImportacaoFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('importacao-feedback')
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

  return resposta
}

function renderAnalise(resultado) {
  document.getElementById('analise-novos').textContent = resultado.novos || 0
  document.getElementById('analise-existentes').textContent = resultado.existentes || 0

  const skusWrapper = document.getElementById('importacao-skus-wrapper')
  const skusContainer = document.getElementById('importacao-skus-existentes')
  const skusExistentes = Array.isArray(resultado.skusExistentes) ? resultado.skusExistentes : []

  if (skusExistentes.length) {
    skusContainer.innerHTML = skusExistentes
      .map((sku) => `<span class="pill">${sku}</span>`)
      .join('')
    skusWrapper.classList.remove('hidden')
  } else {
    skusContainer.innerHTML = ''
    skusWrapper.classList.add('hidden')
  }

  document.getElementById('importacao-analise-card').classList.remove('hidden')
}

function renderResultadoFinal(resultado) {
  document.getElementById('resultado-importados').textContent = resultado.importados || 0
  document.getElementById('resultado-atualizados').textContent = resultado.atualizados || 0
  document.getElementById('resultado-erros').textContent = resultado.erros || 0
  document.getElementById('importacao-resultado-card').classList.remove('hidden')
}

function resetResultados() {
  document.getElementById('importacao-analise-card').classList.add('hidden')
  document.getElementById('importacao-resultado-card').classList.add('hidden')
  document.getElementById('confirmar-importacao-button').classList.add('hidden')
}

function buildImportacaoFormData() {
  if (!arquivoSelecionado) {
    throw new Error('Selecione um arquivo .xlsx antes de continuar')
  }

  const formData = new FormData()
  formData.append('arquivo', arquivoSelecionado)
  return formData
}

async function baixarModeloExcel() {
  const button = document.getElementById('baixar-modelo-button')
  button.disabled = true
  button.textContent = 'Baixando...'

  try {
    const resposta = await apiFileFetch('/produtos/modelo-importacao')
    const blob = await resposta.blob()
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = downloadUrl
    link.download = 'modelo-importacao-produtos.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(downloadUrl)

    setImportacaoFeedback('Modelo baixado com sucesso.', 'text-success')
  } catch (error) {
    setImportacaoFeedback(error.message, 'text-danger')
  } finally {
    button.disabled = false
    button.textContent = 'Baixar modelo Excel'
  }
}

async function analisarPlanilha() {
  const button = document.getElementById('analisar-planilha-button')
  button.disabled = true
  button.textContent = 'Analisando...'

  try {
    resetResultados()
    const resposta = await apiFileFetch('/produtos/importar', {
      method: 'POST',
      body: buildImportacaoFormData()
    })
    const resultado = await resposta.json()

    renderAnalise(resultado)
    document.getElementById('confirmar-importacao-button').classList.remove('hidden')
    setImportacaoFeedback('Analise concluida com sucesso.', 'text-success')
  } catch (error) {
    setImportacaoFeedback(error.message, 'text-danger')
  } finally {
    button.disabled = false
    button.textContent = 'Analisar planilha'
  }
}

async function confirmarImportacao() {
  const button = document.getElementById('confirmar-importacao-button')
  button.disabled = true
  button.textContent = 'Importando...'

  try {
    const resposta = await apiFileFetch('/produtos/importar-confirmado', {
      method: 'POST',
      body: buildImportacaoFormData()
    })
    const resultado = await resposta.json()

    renderResultadoFinal(resultado)
    setImportacaoFeedback('Importacao concluida.', 'text-success')
  } catch (error) {
    setImportacaoFeedback(error.message, 'text-danger')
  } finally {
    button.disabled = false
    button.textContent = 'Confirmar importacao'
  }
}

document.getElementById('arquivo-importacao').addEventListener('change', function () {
  arquivoSelecionado = this.files[0] || null
  resetResultados()
  setImportacaoFeedback('')
})

document.getElementById('baixar-modelo-button').addEventListener('click', baixarModeloExcel)
document.getElementById('analisar-planilha-button').addEventListener('click', analisarPlanilha)
document.getElementById('confirmar-importacao-button').addEventListener('click', confirmarImportacao)
