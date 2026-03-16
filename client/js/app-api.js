function getToken() {
  return localStorage.getItem('token')
}

async function apiFetch(url, options = {}) {
  const token = getToken()
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const resposta = await fetch(url, {
    ...options,
    headers
  })

  if (resposta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/login.html'
    throw new Error('Sessao expirada')
  }

  const contentType = resposta.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!resposta.ok) {
    if (isJson) {
      const dadosErro = await resposta.json()
      throw new Error(dadosErro.erro || 'Erro na requisicao')
    }

    throw new Error((await resposta.text()) || 'Erro na requisicao')
  }

  if (!isJson) {
    throw new Error('Resposta invalida da API')
  }

  return resposta.json()
}

function logoutUsuario() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  window.location.href = '/login.html'
}
