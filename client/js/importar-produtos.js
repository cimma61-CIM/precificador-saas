let arquivoSelecionado = null
const fileInput = document.getElementById('arquivo-importacao')
const nomeArquivo = document.getElementById('nomeArquivo')
let validacaoPlanilhaAtual = null

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

function resetValidacaoPlanilha() {
  validacaoPlanilhaAtual = null
  document.getElementById('importacao-validacao-card').classList.add('hidden')
  document.getElementById('validacao-validos').textContent = '0'
  document.getElementById('validacao-erros').textContent = '0'
  document.getElementById('validacao-erros-lista').classList.add('hidden')
  document.getElementById('validacao-erros-lista').innerHTML = ''
  document.getElementById('importacao-preview-wrapper').classList.add('hidden')
  document.getElementById('importacao-preview-body').innerHTML = ''
}

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarSku(valor) {
  return normalizarTexto(valor).toUpperCase()
}

function normalizarEan(valor) {
  return normalizarTexto(valor).replace(/\s+/g, '')
}

function normalizarNumero(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return null
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : NaN
  }

  const bruto = String(valor).trim()
  const texto = bruto.includes(',') && bruto.includes('.')
    ? bruto.replace(/\./g, '').replace(',', '.')
    : bruto.replace(',', '.')
  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : NaN
}

function normalizarCabecalho(valor) {
  return normalizarTexto(valor).toLowerCase()
}

function renderPreviewPlanilha(rows) {
  const wrapper = document.getElementById('importacao-preview-wrapper')
  const body = document.getElementById('importacao-preview-body')

  if (!rows.length) {
    wrapper.classList.add('hidden')
    body.innerHTML = ''
    return
  }

  wrapper.classList.remove('hidden')
  body.innerHTML = rows.map((row) => `
    <tr class="${row.errors.length ? 'importacao-preview-row-error' : ''}">
      <td class="${row.errorFields.includes('sku') ? 'importacao-preview-cell-error' : ''}">${row.sku || ''}</td>
      <td class="${row.errorFields.includes('nome') ? 'importacao-preview-cell-error' : ''}">${row.nome || ''}</td>
      <td class="${row.errorFields.includes('ean') ? 'importacao-preview-cell-error' : ''}">${row.ean || ''}</td>
      <td class="${row.errorFields.includes('custo') ? 'importacao-preview-cell-error' : ''}">${row.custoRaw || ''}</td>
      <td>${row.precoVendaRaw || ''}</td>
      <td class="${row.errorFields.includes('margem_desejada') ? 'importacao-preview-cell-error' : ''}">${row.margemRaw || ''}</td>
      <td>${row.categoria || ''}</td>
      <td>
        <span class="status-badge ${row.errors.length ? 'status-error' : 'status-ok'}">
          ${row.errors.length ? 'Erro' : 'Valido'}
        </span>
      </td>
    </tr>
  `).join('')
}

function renderValidacaoPlanilha(validacao) {
  document.getElementById('importacao-validacao-card').classList.remove('hidden')
  document.getElementById('validacao-validos').textContent = String(validacao.validos)
  document.getElementById('validacao-erros').textContent = String(validacao.linhasComErro)

  const lista = document.getElementById('validacao-erros-lista')

  if (!validacao.erros.length) {
    lista.classList.add('hidden')
    lista.innerHTML = ''
    renderPreviewPlanilha(validacao.previewRows || [])
    return
  }

  lista.classList.remove('hidden')
  lista.innerHTML = validacao.erros
    .map((erro) => `<div class="pill text-danger">${erro}</div>`)
    .join('')

  renderPreviewPlanilha(validacao.previewRows || [])
}

async function validarPlanilhaFrontend(arquivo) {
  if (!arquivo) {
    throw new Error('Selecione um arquivo .xlsx antes de continuar')
  }

  if (typeof XLSX === 'undefined') {
    throw new Error('Biblioteca de leitura de planilha indisponivel no frontend')
  }

  const buffer = await arquivo.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const primeiraAba = workbook.SheetNames[0]

  if (!primeiraAba) {
    throw new Error('A planilha nao possui abas para validacao')
  }

  const worksheet = workbook.Sheets[primeiraAba]
  const linhas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  if (linhas.length <= 1) {
    return {
      validos: 0,
      linhasComErro: 1,
      erros: ['Planilha sem dados para importar'],
      previewRows: []
    }
  }

  const cabecalhos = linhas[0].map(normalizarCabecalho)
  const indiceSku = cabecalhos.indexOf('sku')
  const indiceNome = cabecalhos.indexOf('nome')
  const indiceEan = cabecalhos.indexOf('ean')
  const indiceCusto = cabecalhos.indexOf('custo')
  const indicePrecoVenda = cabecalhos.indexOf('preco_venda')
  const indiceMargem = cabecalhos.indexOf('margem_desejada')
  const indiceCategoria = cabecalhos.indexOf('categoria')
  const erros = []
  const linhasComErro = new Set()
  const skus = new Map()
  const previewRows = []
  let validos = 0

  if (indiceSku < 0 || indiceNome < 0 || indiceCusto < 0) {
    if (indiceSku < 0) {
      erros.push('Cabecalho obrigatorio ausente: sku')
    }
    if (indiceNome < 0) {
      erros.push('Cabecalho obrigatorio ausente: nome')
    }
    if (indiceCusto < 0) {
      erros.push('Cabecalho obrigatorio ausente: custo')
    }

    return {
      validos: 0,
      linhasComErro: erros.length,
      erros,
      previewRows
    }
  }

  for (let i = 1; i < linhas.length; i += 1) {
    const linha = linhas[i]

    if (!Array.isArray(linha) || linha.every((coluna) => normalizarTexto(coluna) === '')) {
      continue
    }

    const numeroLinha = i + 1
    const sku = normalizarSku(linha[indiceSku])
    const nome = normalizarTexto(linha[indiceNome])
    const ean = normalizarEan(linha[indiceEan])
    const custo = normalizarNumero(linha[indiceCusto])
    const custoRaw = normalizarTexto(linha[indiceCusto])
    const precoVendaRaw = indicePrecoVenda >= 0 ? normalizarTexto(linha[indicePrecoVenda]) : ''
    const margem = indiceMargem >= 0 ? normalizarNumero(linha[indiceMargem]) : null
    const margemRaw = indiceMargem >= 0 ? normalizarTexto(linha[indiceMargem]) : ''
    const categoria = indiceCategoria >= 0 ? normalizarTexto(linha[indiceCategoria]) : ''
    const errosLinha = []
    const errorFields = []

    if (!sku) {
      errosLinha.push(`Linha ${numeroLinha}: sku obrigatorio`)
      errorFields.push('sku')
    }

    if (!nome) {
      errosLinha.push(`Linha ${numeroLinha}: nome obrigatorio`)
      errorFields.push('nome')
    }

    if (custo === null || Number.isNaN(custo) || custo <= 0) {
      errosLinha.push(`Linha ${numeroLinha}: custo invalido`)
      errorFields.push('custo')
    }

    if (indiceMargem >= 0 && linha[indiceMargem] !== '' && (margem === null || Number.isNaN(margem) || margem < 0)) {
      errosLinha.push(`Linha ${numeroLinha}: margem invalida`)
      errorFields.push('margem_desejada')
    }

    if (ean && !/^[0-9]{8,14}$/.test(ean)) {
      errosLinha.push(`Linha ${numeroLinha}: ean invalido`)
      errorFields.push('ean')
    }

    if (sku) {
      if (skus.has(sku)) {
        errosLinha.push(`Linha ${numeroLinha}: sku duplicado na planilha`)
        errorFields.push('sku')
      } else {
        skus.set(sku, numeroLinha)
      }
    }

    previewRows.push({
      linha: numeroLinha,
      sku,
      nome,
      ean,
      custoRaw,
      precoVendaRaw,
      margemRaw,
      categoria,
      errors: errosLinha,
      errorFields
    })

    if (errosLinha.length) {
      linhasComErro.add(numeroLinha)
      erros.push(...errosLinha)
      continue
    }

    validos += 1
  }

  return { validos, linhasComErro: linhasComErro.size, erros, previewRows }
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
    validacaoPlanilhaAtual = await validarPlanilhaFrontend(arquivoSelecionado)
    renderValidacaoPlanilha(validacaoPlanilhaAtual)

    if (validacaoPlanilhaAtual.erros.length) {
      throw new Error('Corrija os erros da planilha antes de importar')
    }

    const resposta = await apiFileFetch('/produtos/importar', {
      method: 'POST',
      body: buildImportacaoFormData()
    })
    const resultado = await resposta.json()

    renderAnalise(resultado)
    document.getElementById('confirmar-importacao-button').classList.remove('hidden')
    setImportacaoFeedback('Analise concluida com sucesso.', 'text-success')
  } catch (error) {
    document.getElementById('confirmar-importacao-button').classList.add('hidden')
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
    if (!validacaoPlanilhaAtual || validacaoPlanilhaAtual.erros.length) {
      throw new Error('A importacao foi bloqueada. Corrija os erros da planilha antes de confirmar')
    }

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

document.getElementById('btnUpload').addEventListener('click', () => {
  fileInput.click()
})

fileInput.addEventListener('change', function () {
  arquivoSelecionado = this.files[0] || null
  nomeArquivo.innerText = arquivoSelecionado?.name || 'Nenhum arquivo escolhido'
  resetResultados()
  resetValidacaoPlanilha()
  setImportacaoFeedback('')
})

document.getElementById('baixar-modelo-button').addEventListener('click', baixarModeloExcel)
document.getElementById('analisar-planilha-button').addEventListener('click', analisarPlanilha)
document.getElementById('confirmar-importacao-button').addEventListener('click', confirmarImportacao)
