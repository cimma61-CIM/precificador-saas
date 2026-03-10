const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/dashboard', async (req, res) => {
  const usuarioId = req.user.id

  try {
    const resumoResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_produtos,
        COALESCE(
          AVG(
            CASE
              WHEN preco > 0 THEN ((preco - custo) / preco)
              ELSE NULL
            END
          ),
          0
        ) AS margem_media,
        COUNT(*) FILTER (WHERE preco < custo)::int AS produtos_margem_negativa,
        COALESCE(SUM((preco - custo) * quantidade), 0) AS lucro_estimado,
        COALESCE((
          SELECT COUNT(*)::int
          FROM taxas_marketplace tm
          WHERE tm.usuario_id = $1
        ), 0) AS marketplaces_configurados
      FROM produtos
      WHERE usuario_id = $1
      `,
      [usuarioId]
    )

    const ultimoCalculoResult = await pool.query(
      `
      SELECT nome, preco
      FROM produtos
      WHERE usuario_id = $1
      AND preco > 0
      ORDER BY id DESC
      LIMIT 1
      `,
      [usuarioId]
    )

    const negativosResult = await pool.query(
      `
      SELECT
        id,
        nome,
        custo,
        preco,
        quantidade,
        ROUND((((preco - custo) / NULLIF(preco, 0))::numeric), 4) AS margem
      FROM produtos
      WHERE usuario_id = $1
      AND preco < custo
      ORDER BY (preco - custo) ASC, id DESC
      LIMIT 5
      `,
      [usuarioId]
    )

    const resumo = resumoResult.rows[0]
    const ultimoCalculo = ultimoCalculoResult.rows[0]

    return res.json({
      total_produtos: Number(resumo.total_produtos || 0),
      marketplaces_configurados: Number(resumo.marketplaces_configurados || 0),
      margem_media: Number(Number(resumo.margem_media || 0).toFixed(4)),
      produtos_margem_negativa: Number(resumo.produtos_margem_negativa || 0),
      lucro_estimado: Number(Number(resumo.lucro_estimado || 0).toFixed(2)),
      ultimo_calculo_valor: Number(Number(ultimoCalculo?.preco || 0).toFixed(2)),
      ultimo_calculo_label: ultimoCalculo
        ? ultimoCalculo.nome
        : 'Nenhum calculo registrado',
      produtos_negativos: negativosResult.rows.map((produto) => ({
        ...produto,
        custo: Number(produto.custo),
        preco: Number(produto.preco),
        quantidade: Number(produto.quantidade || 0),
        margem: Number(produto.margem || 0)
      }))
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: 'Erro ao carregar dashboard' })
  }
})

router.get('/lucro', async (req, res) => {
  const usuarioId = req.user.id
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const requestedLimit = parseInt(req.query.limit, 10) || 50
  const limit = Math.min(Math.max(requestedLimit, 1), 200)
  const offset = (page - 1) * limit

  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM produtos WHERE usuario_id = $1',
      [usuarioId]
    )

    const result = await pool.query(
      `
      SELECT
        id,
        nome,
        custo,
        preco,
        quantidade
      FROM produtos
      WHERE usuario_id = $1
      ORDER BY id DESC
      LIMIT $2 OFFSET $3
      `,
      [usuarioId, limit, offset]
    )

    const produtos = result.rows.map((produto) => {
      const custo = Number(produto.custo)
      const preco = Number(produto.preco)
      const quantidade = Number(produto.quantidade || 0)
      const lucroUnitario = preco - custo
      const lucroTotal = lucroUnitario * quantidade

      return {
        ...produto,
        lucro_unitario: Number(lucroUnitario.toFixed(2)),
        lucro_total: Number(lucroTotal.toFixed(2)),
        prejuizo: lucroUnitario < 0
      }
    })

    const total = totalResult.rows[0]?.total || 0
    const totalPages = Math.max(Math.ceil(total / limit), 1)

    return res.json({
      produtos,
      total,
      page,
      limit,
      totalPages
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: 'Erro na analise' })
  }
})

module.exports = router
