async function calcularMetricas(produtos = []) {
  return produtos.map((p) => {
    const receita = Number(p.preco_venda || 0)
    const custo = Number(p.custo || 0)
    const tarifa = Number(p.tarifa || 0)
    const imposto = Number(p.imposto || 0)
    const ads = Number(p.ads || 0)

    const lucro = receita - custo - tarifa - imposto - ads
    const margem = receita > 0 ? lucro / receita : 0
    const roi = custo > 0 ? lucro / custo : 0

    return {
      id: p.id,
      nome: p.nome,
      receita,
      custo,
      tarifa,
      imposto,
      ads,
      lucro,
      margem,
      roi
    }
  })
}

module.exports = { calcularMetricas }
