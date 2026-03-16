function preencherMinhaConta() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  document.getElementById('minha-conta-nome').value = usuario.nome || 'Nao informado'
  document.getElementById('minha-conta-email').value = usuario.email || 'Nao informado'
}

preencherMinhaConta()
