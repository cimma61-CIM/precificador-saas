let paginaAtual = 1
let buscaAtual = ""

async function salvarProduto() {

const produto = {

nome: document.getElementById("nome").value,
barcode: document.getElementById("barcode").value,
ncm: document.getElementById("ncm").value,
custo: document.getElementById("custo").value,
preco: document.getElementById("preco").value,
quantidade: document.getElementById("quantidade").value,
estoque_min: document.getElementById("estoque_min").value,
estoque_max: document.getElementById("estoque_max").value,
localizacao: document.getElementById("localizacao").value,
descricao: document.getElementById("descricao").value

}

await fetch("http://localhost:3000/produtos", {

method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify(produto)

})

carregarProdutos()

}

async function carregarProdutos(page = 1, busca = "") {

const resposta = await fetch(`http://localhost:3000/produtos?page=${page}&busca=${busca}`)

const dados = await resposta.json()

const tabela = document.getElementById("tabela-produtos")

tabela.innerHTML = ""

dados.produtos.forEach(produto => {

tabela.innerHTML += `

<tr>

<td>${produto.id}</td>
<td>${produto.nome}</td>
<td>${produto.barcode || ""}</td>
<td>${produto.ncm || ""}</td>
<td>${produto.quantidade || 0}</td>
<td>${produto.custo}</td>
<td>${produto.preco}</td>
<td>${produto.localizacao || ""}</td>

</tr>

`

})

criarPaginacao(dados.totalPages)

}

function criarPaginacao(totalPages) {

const paginacao = document.getElementById("paginacao")

paginacao.innerHTML = ""

for (let i = 1; i <= totalPages; i++) {

paginacao.innerHTML += `

<button onclick="irParaPagina(${i})">${i}</button>

`

}

}

function irParaPagina(pagina) {

paginaAtual = pagina

carregarProdutos(paginaAtual, buscaAtual)

}

document
.getElementById("busca-produto")
.addEventListener("input", function () {

buscaAtual = this.value

paginaAtual = 1

carregarProdutos(paginaAtual, buscaAtual)

})

carregarProdutos()