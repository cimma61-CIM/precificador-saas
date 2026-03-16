function preencherConta() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  document.getElementById('conta-nome').value = usuario.nome || 'Nao informado'
  document.getElementById('conta-email').value = usuario.email || 'Nao informado'
  document.getElementById('conta-plano').value = usuario.plano || 'starter'
}

preencherConta()
