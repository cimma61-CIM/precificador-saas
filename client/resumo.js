function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function formatarPercentual(valor) {
  return `${(Number(valor || 0) * 100).toFixed(2)}%`
}

async function carregarDashboard() {
  const dados = await apiFetch('/analise/dashboard')

  document.getElementById('total-produtos').textContent = dados.total_produtos
  document.getElementById('marketplaces-configurados').textContent =
    dados.marketplaces_configurados
  document.getElementById('margem-media').textContent = formatarPercentual(dados.margem_media)
  document.getElementById('produtos-negativos-total').textContent =
    dados.produtos_margem_negativa
  document.getElementById('lucro-estimado').textContent = formatarMoeda(dados.lucro_estimado)
  document.getElementById('ultimo-calculo').textContent = formatarMoeda(dados.ultimo_calculo_valor)
  document.getElementById('ultimo-calculo-label').textContent =
    dados.ultimo_calculo_label

  const tabela = document.getElementById('tabela-negativos')
  tabela.innerHTML = ''

  if (!dados.produtos_negativos.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="6">Nenhum produto com margem negativa.</td>
      </tr>
    `
    return
  }

  dados.produtos_negativos.forEach((produto) => {
    tabela.innerHTML += `
      <tr>
        <td>${produto.id}</td>
        <td>${produto.nome}</td>
        <td>${formatarMoeda(produto.custo)}</td>
        <td>${formatarMoeda(produto.preco)}</td>
        <td>${produto.quantidade}</td>
        <td class="text-danger">${formatarPercentual(produto.margem)}</td>
      </tr>
    `
  })
}

carregarDashboard().catch((error) => {
  const tabela = document.getElementById('tabela-negativos')
  tabela.innerHTML = `
    <tr>
      <td colspan="6">${error.message}</td>
    </tr>
  `
})
