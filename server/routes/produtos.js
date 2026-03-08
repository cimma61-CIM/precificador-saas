const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/', async (req, res) => {

  const page = parseInt(req.query.page) || 1
  const limit = 50
  const offset = (page - 1) * limit

  try {

    const result = await pool.query(
      'SELECT * FROM produtos ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    )

    res.json(result.rows)

  } catch (err) {

    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar produtos' })

  }

})

module.exports = router