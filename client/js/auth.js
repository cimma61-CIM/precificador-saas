const loginForm = document.getElementById('login-form')
const loginButton = document.getElementById('login-button')
const feedbackElement = document.getElementById('login-feedback')

if (localStorage.getItem('token')) {
  window.location.href = '/dashboard.html'
}

function setFeedback(message, isError = false) {
  if (!feedbackElement) {
    return
  }

  feedbackElement.textContent = message
  feedbackElement.className = `auth-feedback${isError ? ' error' : ' success'}`
}

function persistirSessao(data) {
  if (!data?.token) {
    throw new Error('Resposta de login sem token.')
  }

  localStorage.setItem('token', data.token)
  localStorage.setItem('usuario', JSON.stringify(data.usuario || {}))

  if (localStorage.getItem('token') !== data.token) {
    throw new Error('Nao foi possivel salvar o token no navegador.')
  }
}

async function autenticarUsuario(event) {
  event.preventDefault()

  const email = document.getElementById('email').value.trim()
  const senha = document.getElementById('senha').value

  if (!email || !senha) {
    setFeedback('Informe email e senha para continuar.', true)
    return
  }

  loginButton.disabled = true
  loginButton.textContent = 'Entrando...'
  setFeedback('')

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    })

    persistirSessao(data)
    setFeedback('Login realizado. Redirecionando...')
    window.location.href = '/dashboard.html'
  } catch (error) {
    setFeedback(error.message, true)
  } finally {
    loginButton.disabled = false
    loginButton.textContent = 'Entrar'
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', autenticarUsuario)
}
