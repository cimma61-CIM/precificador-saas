const express = require('express')
const router = express.Router()
const pool = require('../db')

function normalizarCodigo(codigo) {
  return String(codigo || '').replace(/\D/g, '')
}

router.get('/sugestoes', async (req, res) => {
  const query = String(req.query.q || '').trim()

  if (query.length < 2) {
    return res.json({ ncm: [] })
  }

  const codigoNumerico = normalizarCodigo(query)

  try {
    const result = await pool.query(
      `
      SELECT codigo, descricao
      FROM ncm
      WHERE (
        regexp_replace(codigo, '\D', '', 'g') LIKE $1
        OR descricao ILIKE $2
      )
      ORDER BY
        CASE
          WHEN regexp_replace(codigo, '\D', '', 'g') = $3 THEN 0
          WHEN regexp_replace(codigo, '\D', '', 'g') LIKE $1 THEN 1
          WHEN codigo ILIKE $4 THEN 2
          ELSE 3
        END,
        codigo ASC
      LIMIT 10
      `,
      [`${codigoNumerico}%`, `%${query}%`, codigoNumerico, `${query}%`]
    )

    return res.json({ ncm: result.rows })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao buscar sugestoes de NCM' })
  }
})

module.exports = router
