let compras = []
let fornecedores = []
let produtos = []
let itensCompra = []
let compraSelecionadaId = null

function setFeedback(msg, tipo = '') {
  const feedback = document.getElementById('compras-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = msg
  setTimeout(() => {
    feedback.textContent = ''
    feedback.className = 'feedback'
  }, 5000)
}

function getProdutoById(produtoId) {
  return produtos.find((produto) => Number(produto.id) === Number(produtoId)) || null
}

function renderProdutosSelect() {
  const select = document.getElementById('produto')
  select.innerHTML = '<option value="">Selecione um produto</option>'

  if (!produtos.length) {
    select.innerHTML += '<option value="">Nenhum produto disponivel</option>'
    return
  }

  select.innerHTML += produtos.map((produto) => {
    const label = `${produto.nome || 'Produto sem nome'}${produto.sku ? ` (${produto.sku})` : ''}`
    return `<option value="${produto.id}">${label}</option>`
  }).join('')
}

function renderItensCompra() {
  const card = document.getElementById('itens-compra-card')
  const tbody = document.getElementById('tabela-itens-compra')

  if (!itensCompra.length) {
    card.classList.add('hidden')
    tbody.innerHTML = '<tr><td colspan="4">Nenhum item adicionado.</td></tr>'
    return
  }

  card.classList.remove('hidden')

  tbody.innerHTML = itensCompra.map((item, index) => {
    const produto = getProdutoById(item.produto_id)
    const produtoNome = produto ? `${produto.nome}${produto.sku ? ` (${produto.sku})` : ''}` : `ID ${item.produto_id}`
    return `
      <tr>
        <td>${produtoNome}</td>
        <td>${item.quantidade}</td>
        <td>${Number(item.custo_unitario).toFixed(2)}</td>
        <td>
          <button type="button" class="button-secondary" onclick="removerItemCompra(${index})">Remover</button>
        </td>
      </tr>
    `
  }).join('')
}

function limparFormularioItens() {
  document.getElementById('produto').value = ''
  document.getElementById('quantidade-item').value = '1'
  document.getElementById('custo-item').value = ''
}

function setModoEdicao(compraId, fornecedorNome) {
  compraSelecionadaId = compraId
  const info = document.getElementById('compra-info')
  const infoText = document.getElementById('compra-info-text')
  const cancelarBtn = document.getElementById('cancelar-edicao-btn')

  if (compraId) {
    info.classList.remove('hidden')
    cancelarBtn.classList.remove('hidden')
    infoText.textContent = `#${compraId} — ${fornecedorNome || 'Fornecedor desconhecido'}`
  } else {
    info.classList.add('hidden')
    cancelarBtn.classList.add('hidden')
    infoText.textContent = ''
  }
}

function limparFormularioCompra() {
  compraSelecionadaId = null
  document.getElementById('compra-id').value = ''
  document.getElementById('data').value = ''
  document.getElementById('contato').value = ''
  limparFormularioItens()
  itensCompra = []
  renderItensCompra()
  setModoEdicao(null, '')
}

function abrirDetalheCompra(compraId) {
  return apiFetch(`/compras/${compraId}`)
    .then((data) => {
      const compra = data.compra
      const itens = Array.isArray(data.itens) ? data.itens : []

      if (!compra) {
        throw new Error('Compra nao encontrada')
      }

      document.getElementById('compra-id').value = compra.id
      document.getElementById('data').value = compra.data ? new Date(compra.data).toISOString().slice(0, 10) : ''
      document.getElementById('contato').value = compra.fornecedor_id || ''
      itensCompra = itens.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        custo_unitario: item.custo_unitario
      }))
      renderItensCompra()
      setModoEdicao(compra.id, compra.fornecedor_nome || compra.fornecedor || '')
    })
    .catch((error) => {
      console.error(error)
      setFeedback('Falha ao carregar compra: ' + error.message, 'error')
      throw error
    })
}

function cancelarEdicaoCompra() {
  limparFormularioCompra()
}

function adicionarItem() {
  const produtoId = Number(document.getElementById('produto').value)
  const quantidade = Number(document.getElementById('quantidade-item').value)
  const custo = Number(document.getElementById('custo-item').value)

  if (!produtoId) {
    setFeedback('Selecione um produto para adicionar.', 'error')
    return
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    setFeedback('Quantidade deve ser maior que zero.', 'error')
    return
  }

  if (Number.isNaN(custo) || custo <= 0) {
    setFeedback('Informe um custo valido para o item.', 'error')
    return
  }

  itensCompra.push({
    produto_id: produtoId,
    quantidade,
    custo_unitario: custo
  })

  renderItensCompra()
  limparFormularioItens()
}

function removerItemCompra(index) {
  if (index < 0 || index >= itensCompra.length) {
    return
  }

  itensCompra.splice(index, 1)
  renderItensCompra()
}

function filtrarCompras() {
  const busca = document.getElementById('busca-compra').value.toLowerCase()
  return compras.filter(c => (c.fornecedor_nome || c.fornecedor || '').toLowerCase().includes(busca))
}

function renderCompras() {
  const tbody = document.getElementById('tabela-compras')
  const dados = filtrarCompras()

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="4">Nenhuma compra encontrada</td></tr>'
    return
  }

  tbody.innerHTML = dados.map(c => `
    <tr data-id="${c.id}" class="clicavel">
      <td>${c.data}</td>
      <td>${c.fornecedor_nome || c.fornecedor || '-'}</td>
      <td>${c.fornecedor_id || c.contato_id || '-'}</td>
      <td>${c.total_itens || 0}</td>
    </tr>
  `).join('')
}

async function carregarFornecedores() {
  try {
    const contatos = await apiFetch('/contatos')
    fornecedores = contatos.filter(c => ['fornecedor', 'ambos'].includes(c.tipo))

    const select = document.getElementById('contato')
    select.innerHTML = '<option value="">Selecione um fornecedor</option>' + fornecedores.map(c =>
      `<option value="${c.id}">${c.nome} (${c.tipo})</option>`
    ).join('')

    if (!fornecedores.length) {
      setFeedback('Nenhum fornecedor encontrado. Cadastre contatos com tipo fornecedor ou ambos.', 'error')
    }
  } catch (error) {
    console.error(error)
    setFeedback('Falha ao carregar fornecedores: ' + error.message, 'error')
  }
}

async function carregarProdutos() {
  try {
    const data = await apiFetch('/produtos?page=1&limit=200')
    produtos = Array.isArray(data.produtos) ? data.produtos : []
    renderProdutosSelect()
  } catch (error) {
    console.error(error)
    setFeedback('Falha ao carregar produtos: ' + error.message, 'error')
  }
}

async function carregarCompras() {
  try {
    const data = await apiFetch('/compras')
    compras = Array.isArray(data.compras) ? data.compras : []
    renderCompras()
  } catch (error) {
    console.error(error)
    setFeedback('Falha ao carregar compras: ' + error.message, 'error')
  }
}

async function salvarCompra(event) {
  event.preventDefault()

  const dataCompra = document.getElementById('data').value
  const contatoId = Number(document.getElementById('contato').value)

  if (!dataCompra || !contatoId) {
    setFeedback('Data e fornecedor sao obrigatorios', 'error')
    return
  }

  if (!itensCompra.length) {
    setFeedback('Adicione pelo menos um item antes de salvar a compra.', 'error')
    return
  }

  try {
    const url = compraSelecionadaId ? `/compras/${compraSelecionadaId}` : '/compras'
    const method = compraSelecionadaId ? 'PUT' : 'POST'

    await apiFetch(url, {
      method,
      body: JSON.stringify({
        data: dataCompra,
        fornecedor_id: contatoId,
        itens: itensCompra
      })
    })

    setFeedback('Compra salva com sucesso', 'success')
    itensCompra = []
    renderItensCompra()
    limparFormularioItens()
    limparFormularioCompra()
    carregarCompras()
  } catch (error) {
    console.error(error)
    setFeedback('Falha ao salvar compra: ' + error.message, 'error')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarFornecedores()
  carregarProdutos()
  carregarCompras()

  document.getElementById('form-compra').addEventListener('submit', salvarCompra)
  document.getElementById('adicionar-item-btn').addEventListener('click', adicionarItem)
  document.getElementById('cancelar-edicao-btn').addEventListener('click', cancelarEdicaoCompra)
  document.getElementById('busca-compra').addEventListener('input', renderCompras)
  document.getElementById('tabela-compras').addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-id]')
    if (!row) {
      return
    }

    abrirDetalheCompra(row.dataset.id)
  })
})