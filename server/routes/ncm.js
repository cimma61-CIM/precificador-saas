const express = require('express')
const router = express.Router()
const pool = require('../db')

function normalizarCodigo(codigo) {
  return String(codigo || '').replace(/\D/g, '')
}

function administradorNcm(req) {
  const emails = String(process.env.NCM_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  return emails.includes(String(req.user?.email || '').trim().toLowerCase())
}

router.get('/status-administrativo', async (req, res) => {
  if (!administradorNcm(req)) {
    return res.status(403).json({ erro: 'Acesso administrativo necessario.' })
  }

  try {
    const result = await pool.query(`
      SELECT finalizado_em, relatorio
      FROM ncm_catalog_runs
      WHERE operacao = 'check' AND resultado = 'sucesso'
      ORDER BY finalizado_em DESC
      LIMIT 1
    `)
    const ultimaVerificacao = result.rows[0] || null
    const vencida = !ultimaVerificacao ||
      new Date(ultimaVerificacao.finalizado_em).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000

    return res.json({
      ultima_verificacao_em: ultimaVerificacao?.finalizado_em || null,
      vencida,
      prazo_dias: 30,
      versao: ultimaVerificacao?.relatorio?.version || null
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao consultar a manutencao do catalogo NCM.' })
  }
})

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
