let taxaEmEdicao = null
let taxasCache = []

function getToken() {
  return localStorage.getItem('token')
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

function setFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

async function apiFetch(url, options = {}) {
  const resposta = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {})
    }
  })

  if (resposta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.top.location.href = '/'
    throw new Error('Sessão expirada')
  }

  const dados = await resposta.json()

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Erro na requisição')
  }

  return dados
}

async function loadMarketplaces() {
  const dados = await apiFetch('/marketplaces')
  const select = document.getElementById('marketplace-id')

  select.innerHTML = '<option value="">Selecione um marketplace</option>'

  dados.marketplaces.forEach((marketplace) => {
    select.innerHTML += `
      <option value="${marketplace.id}">${marketplace.nome}</option>
    `
  })
}

function limparFormulario() {
  document.getElementById('taxa-id').value = ''
  document.getElementById('marketplace-id').value = ''
  document.getElementById('taxa-percentual').value = ''
  document.getElementById('taxa-fixa').value = ''
  document.getElementById('frete-medio').value = ''
  document.getElementById('imposto-percentual').value = ''
  document.getElementById('submit-button').textContent = 'Salvar Taxa'
  taxaEmEdicao = null
}

function preencherFormulario(taxa) {
  document.getElementById('taxa-id').value = taxa.id
  document.getElementById('marketplace-id').value = taxa.marketplace_id
  document.getElementById('taxa-percentual').value = taxa.taxa_percentual
  document.getElementById('taxa-fixa').value = taxa.taxa_fixa
  document.getElementById('frete-medio').value = taxa.frete_medio
  document.getElementById('imposto-percentual').value = taxa.imposto_percentual
  document.getElementById('submit-button').textContent = 'Atualizar Taxa'
  taxaEmEdicao = taxa.id
}

function cancelEdit() {
  limparFormulario()
  setFeedback('')
}

async function loadTaxas() {
  try {
    const dados = await apiFetch('/taxas')
    taxasCache = dados.taxas
    const tabela = document.getElementById('taxas-tabela')
    tabela.innerHTML = ''

    if (!dados.taxas.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="6">Nenhuma taxa cadastrada.</td>
        </tr>
      `
      return
    }

    dados.taxas.forEach((taxa, index) => {
      tabela.innerHTML += `
        <tr>
          <td>${taxa.marketplace_nome}</td>
          <td>${formatarPercentual(taxa.taxa_percentual)}</td>
          <td>${formatarMoeda(taxa.taxa_fixa)}</td>
          <td>${formatarMoeda(taxa.frete_medio)}</td>
          <td>${formatarPercentual(taxa.imposto_percentual)}</td>
          <td>
            <div class="table-actions">
              <button type="button" onclick="editTaxa(${index})">Editar</button>
              <button type="button" class="button-danger" onclick="deleteTaxa(${taxa.id})">Excluir</button>
            </div>
          </td>
        </tr>
      `
    })
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  }
}

async function createTaxa() {
  const freteMedio = document.getElementById('frete-medio').value || 0

  const payload = {
    marketplace_id: document.getElementById('marketplace-id').value,
    taxa_percentual: document.getElementById('taxa-percentual').value,
    taxa_fixa: document.getElementById('taxa-fixa').value,
    frete_medio: freteMedio,
    imposto_percentual: document.getElementById('imposto-percentual').value
  }

  try {
    if (taxaEmEdicao) {
      await apiFetch(`/taxas/${taxaEmEdicao}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      setFeedback('Taxa atualizada com sucesso.', 'text-success')
    } else {
      await apiFetch('/taxas', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setFeedback('Taxa salva com sucesso.', 'text-success')
    }

    limparFormulario()
    await loadTaxas()
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  }
}

async function deleteTaxa(id) {
  const confirmou = window.confirm('Deseja realmente excluir esta taxa?')

  if (!confirmou) {
    return
  }

  try {
    await apiFetch(`/taxas/${id}`, {
      method: 'DELETE'
    })

    if (taxaEmEdicao === id) {
      limparFormulario()
    }

    setFeedback('Taxa removida com sucesso.', 'text-success')
    await loadTaxas()
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  }
}

function editTaxa(index) {
  const taxa = taxasCache[index]
  preencherFormulario(taxa)
  setFeedback('Modo de edição ativado.', 'text-success')
}

document
  .getElementById('taxa-form')
  .addEventListener('submit', function (event) {
    event.preventDefault()
    createTaxa()
  })

Promise.all([loadMarketplaces(), loadTaxas()]).catch((error) => {
  setFeedback(error.message, 'text-danger')
})
