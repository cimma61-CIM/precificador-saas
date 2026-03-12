const OPEN_EYE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
    <circle cx="12" cy="12" r="3.2" stroke-width="1.8"></circle>
  </svg>
`

const CLOSED_EYE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3l18 18" stroke-width="1.8" stroke-linecap="round"></path>
    <path d="M10.6 6.3A11.2 11.2 0 0 1 12 6c6.7 0 10.5 6 10.5 6a18.4 18.4 0 0 1-4 4.6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M6.5 6.8A18.7 18.7 0 0 0 1.5 12s3.8 6 10.5 6a11 11 0 0 0 3-.4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M9.9 9.9A3 3 0 0 0 9 12c0 1.7 1.3 3 3 3 .8 0 1.6-.3 2.1-.9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
`

function atualizarBotaoSenha(input, button) {
  const senhaVisivel = input.type === 'text'
  button.innerHTML = senhaVisivel ? OPEN_EYE_ICON : CLOSED_EYE_ICON
  button.setAttribute(
    'aria-label',
    senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'
  )
  button.setAttribute('aria-pressed', senhaVisivel ? 'true' : 'false')
}

function configurarCampoSenha(input) {
  if (!input || input.dataset.passwordToggleReady === 'true') {
    return
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'password-field'

  const parent = input.parentNode
  parent.insertBefore(wrapper, input)
  wrapper.appendChild(input)

  input.classList.add('password-input')

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'password-toggle'

  button.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password'
    atualizarBotaoSenha(input, button)
  })

  wrapper.appendChild(button)
  atualizarBotaoSenha(input, button)
  input.dataset.passwordToggleReady = 'true'
}

function inicializarPasswordToggles() {
  document
    .querySelectorAll('input[type="password"][data-password-toggle]')
    .forEach(configurarCampoSenha)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPasswordToggles)
} else {
  inicializarPasswordToggles()
}
