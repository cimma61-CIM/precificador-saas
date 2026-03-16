let paginaAtual = 1
let buscaAtual = ''
let buscaTimer = null
const PAGINACAO_JANELA = 2

function setFeedback(mensagem, tipo = '') {
  const feedback = document.getElementById('produtos-feedback')
  feedback.className = `feedback ${tipo}`.trim()
  feedback.textContent = mensagem
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0))
}

function renderMarketplaces(produto) {
  if (!Array.isArray(produto.marketplaces) || !produto.marketplaces.length) {
    return '<span class="text-soft">Nenhum</span>'
  }

  return produto.marketplaces
    .map((marketplace) => `<span class="pill">${marketplace.nome}</span>`)
    .join(' ')
}

function getPaginasVisiveis(totalPages) {
  const inicio = Math.max(1, paginaAtual - PAGINACAO_JANELA)
  const fim = Math.min(totalPages, paginaAtual + PAGINACAO_JANELA)
  const paginas = []

  for (let i = inicio; i <= fim; i += 1) {
    paginas.push(i)
  }

  return paginas
}

function criarPaginacao(totalPages) {
  const paginacao = document.getElementById('paginacao')
  paginacao.innerHTML = ''

  if (!totalPages || totalPages <= 1) {
    return
  }

  const paginas = getPaginasVisiveis(totalPages)
  const anteriorDesabilitado = paginaAtual <= 1 ? 'disabled' : ''
  const proximaDesabilitada = paginaAtual >= totalPages ? 'disabled' : ''

  paginacao.innerHTML = `
    <button type="button" onclick="irParaPagina(${paginaAtual - 1})" ${anteriorDesabilitado}>
      << Anterior
    </button>
    ${paginas
      .map(
        (pagina) => `
          <button
            type="button"
            onclick="irParaPagina(${pagina})"
            ${pagina === paginaAtual ? 'disabled aria-current="page"' : ''}
          >
            ${pagina}
          </button>
        `
      )
      .join('')}
    <button type="button" onclick="irParaPagina(${paginaAtual + 1})" ${proximaDesabilitada}>
      Proxima >>
    </button>
  `
}

window.irParaPagina = function irParaPagina(pagina) {
  paginaAtual = pagina
  carregarProdutos()
}

window.editarProduto = function editarProduto(id) {
  window.location.href = `/produtos-novo.html?id=${id}`
}

window.recalcularProduto = async function recalcularProduto(id, button) {
  button.disabled = true
  button.textContent = 'Recalculando...'

  try {
    await apiFetch(`/produtos/${id}/recalcular-precos`, {
      method: 'POST',
      body: JSON.stringify({})
    })

    setFeedback('Produto recalculado com sucesso.', 'text-success')
    await carregarProdutos()
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  } finally {
    button.disabled = false
    button.textContent = 'Recalcular'
  }
}

window.excluirProduto = async function excluirProduto(id, button) {
  button.disabled = true
  button.textContent = 'Excluindo...'

  try {
    await apiFetch(`/produtos/${id}`, {
      method: 'DELETE'
    })

    setFeedback('Produto removido com sucesso.', 'text-success')
    await carregarProdutos()
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  } finally {
    button.disabled = false
    button.textContent = 'Excluir'
  }
}

async function carregarProdutos() {
  try {
    const dados = await apiFetch(`/produtos?page=${paginaAtual}&busca=${encodeURIComponent(buscaAtual)}`)
    const tabela = document.getElementById('tabela-produtos')

    if (!Array.isArray(dados.produtos) || !dados.produtos.length) {
      tabela.innerHTML = `
        <tr>
          <td colspan="10">Nenhum produto encontrado.</td>
        </tr>
      `
      criarPaginacao(dados.totalPages || 1)
      return
    }

    tabela.innerHTML = dados.produtos
      .map(
        (produto) => `
          <tr>
            <td>${produto.id}</td>
            <td>${produto.sku || '<span class="text-soft">Auto</span>'}</td>
            <td>${produto.nome}</td>
            <td>${produto.categoria_nome || '<span class="text-soft">Sem categoria</span>'}</td>
            <td>${produto.barcode || '<span class="text-soft">-</span>'}</td>
            <td>${produto.quantidade || 0}</td>
            <td>${formatarMoeda(produto.custo)}</td>
            <td>${formatarMoeda(produto.preco_venda)}</td>
            <td>${renderMarketplaces(produto)}</td>
            <td>
              <div class="table-actions">
                <button class="button-secondary" type="button" onclick="editarProduto(${produto.id})">Editar</button>
                <button class="button-secondary" type="button" onclick="recalcularProduto(${produto.id}, this)">Recalcular</button>
                <button class="button-danger" type="button" onclick="excluirProduto(${produto.id}, this)">Excluir</button>
              </div>
            </td>
          </tr>
        `
      )
      .join('')

    criarPaginacao(dados.totalPages || 1)
  } catch (error) {
    setFeedback(error.message, 'text-danger')
  }
}

document.getElementById('busca-produto').addEventListener('input', function () {
  const valor = this.value.trim()

  if (buscaTimer) {
    clearTimeout(buscaTimer)
  }

  buscaTimer = window.setTimeout(() => {
    buscaAtual = valor
    paginaAtual = 1
    carregarProdutos()
  }, 250)
})

document.getElementById('atualizar-lista-button').addEventListener('click', () => {
  carregarProdutos()
})

carregarProdutos()
