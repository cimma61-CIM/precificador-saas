function preencherMinhaConta() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  document.getElementById('minha-conta-nome').value = usuario.nome || 'Nao informado'
  document.getElementById('minha-conta-email').value = usuario.email || 'Nao informado'
}

function atualizarEstadoTema() {
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'light'
  const botaoClaro = document.getElementById('tema-claro-button')
  const botaoEscuro = document.getElementById('tema-escuro-button')

  if (!botaoClaro || !botaoEscuro) {
    return
  }

  botaoClaro.setAttribute('aria-pressed', String(temaAtual === 'light'))
  botaoEscuro.setAttribute('aria-pressed', String(temaAtual === 'dark'))
}

preencherMinhaConta()
atualizarEstadoTema()
window.addEventListener('themechange', atualizarEstadoTema)
