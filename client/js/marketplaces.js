function getToken() {
  return localStorage.getItem('token')
}

function setMarketplaceFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('marketplace-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

async function apiFetch(url, options = {}) {
  const resposta = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
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

  const contentType = resposta.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!resposta.ok) {
    if (isJson) {
      const erroJson = await resposta.json()
      throw new Error(erroJson.erro || 'Erro na requisição')
    }

    const erroTexto = await resposta.text()
    throw new Error(erroTexto || 'Erro na requisição')
  }

  if (!isJson) {
    const respostaTexto = await resposta.text()
    throw new Error(
      `Resposta inválida da API: ${respostaTexto.slice(0, 120)}`
    )
  }

  return resposta.json()
}

async function loadMarketplaces() {
  try {
    const dados = await apiFetch('/marketplaces', {
      method: 'GET'
    })

    const tabela = document.getElementById('marketplaces-tabela')
    tabela.innerHTML = ''

    if (!dados.marketplaces || !dados.marketplaces.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="2">Nenhum marketplace cadastrado.</td>
        </tr>
      `
      return
    }

    dados.marketplaces.forEach((marketplace) => {
      tabela.innerHTML += `
        <tr>
          <td>${marketplace.nome}</td>
          <td>${marketplace.slug}</td>
        </tr>
      `
    })
  } catch (error) {
    setMarketplaceFeedback(error.message, 'text-danger')
  }
}

async function createMarketplace() {
  const nome = document.getElementById('marketplace-nome').value.trim()

  if (!nome) {
    setMarketplaceFeedback('Informe o nome do marketplace.', 'text-danger')
    return
  }

  try {
    await apiFetch('/marketplaces', {
      method: 'POST',
      body: JSON.stringify({ nome })
    })

    document.getElementById('marketplace-nome').value = ''
    setMarketplaceFeedback('Marketplace salvo com sucesso.', 'text-success')
    await loadMarketplaces()
  } catch (error) {
    setMarketplaceFeedback(error.message, 'text-danger')
  }
}

document
  .getElementById('marketplace-form')
  .addEventListener('submit', function (event) {
    event.preventDefault()
    createMarketplace()
  })

loadMarketplaces()
