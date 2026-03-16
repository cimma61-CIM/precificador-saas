async function carregarMarketplacesAtivos() {
  const dados = await apiFetch('/marketplaces')
  return Array.isArray(dados) ? dados : (dados.marketplaces || [])
}

function preencherSelectMarketplaces(select, marketplaces, placeholder = 'Selecione um marketplace') {
  if (!select) {
    return
  }

  select.innerHTML = `<option value="">${placeholder}</option>`

  marketplaces.forEach((marketplace) => {
    const option = document.createElement('option')
    option.value = marketplace.id
    option.textContent = marketplace.nome
    select.appendChild(option)
  })
}
