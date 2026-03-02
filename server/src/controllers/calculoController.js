exports.calcularPreco = (req, res) => {
  const { custo, margem } = req.body;

  if (!custo || !margem) {
    return res.status(400).json({ erro: "Envie custo e margem" });
  }

  const preco = custo + (custo * margem / 100);

  res.json({
    custo,
    margem,
    precoFinal: preco
  });
};