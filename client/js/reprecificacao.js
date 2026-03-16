function setReprecificacaoFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('reprecificacao-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function atualizarResumoReprecificacao(resultado = {}) {
  const atualizados = Array.isArray(resultado.atualizados) ? resultado.atualizados.length : 0
  const ignorados = Array.isArray(resultado.ignorados) ? resultado.ignorados.length : 0
  const falhas = Array.isArray(resultado.erros) ? resultado.erros.length : 0

  document.getElementById('reprecificacao-processados').textContent = atualizados + ignorados + falhas
  document.getElementById('reprecificacao-atualizados').textContent = atualizados
  document.getElementById('reprecificacao-falhas').textContent = falhas
}

async function reprecificarTodos() {
  const button = document.getElementById('reprecificar-todos-button')
  button.disabled = true
  button.textContent = 'Reprecificando...'
  setReprecificacaoFeedback('')

  try {
    const resultado = await apiFetch('/produtos/recalcular-precos', {
      method: 'POST',
      body: JSON.stringify({})
    })

    atualizarResumoReprecificacao(resultado)
    setReprecificacaoFeedback('Reprecificacao concluida com sucesso.', 'text-success')
  } catch (error) {
    setReprecificacaoFeedback(error.message, 'text-danger')
  } finally {
    button.disabled = false
    button.textContent = 'Reprecificar todos os produtos'
  }
}

document.getElementById('reprecificar-todos-button').addEventListener('click', reprecificarTodos)
