const crypto = require('crypto')
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const {
  isMailConfigured,
  sendResetPasswordEmail
} = require('../services/emailService')

const router = express.Router()

function buildResetLink(req, token) {
  const baseUrl = String(process.env.APP_BASE_URL || '').trim() ||
    `${req.protocol}://${req.get('host')}`
  return `${baseUrl}/resetar-senha.html?token=${token}`
}

router.post('/register', async (req, res) => {
  const client = await pool.connect()

  try {
    const { nome, email, senha } = req.body
    const nomeNormalizado = String(nome || '').trim()
    const emailNormalizado = String(email || '').trim().toLowerCase()

    if (!nomeNormalizado || !emailNormalizado || !senha) {
      return res.status(400).json({
        erro: 'Nome, email e senha sao obrigatorios.'
      })
    }

    await client.query('BEGIN')

    const usuarioExistente = await client.query(
      'SELECT id FROM usuarios WHERE email = $1 LIMIT 1',
      [emailNormalizado]
    )

    if (usuarioExistente.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ erro: 'Email ja cadastrado.' })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    const resultado = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nome, email, plano`,
      [nomeNormalizado, emailNormalizado, senhaHash]
    )

    const usuario = resultado.rows[0]

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    await client.query('COMMIT')

    return res.status(201).json({
      mensagem: 'Usuario criado com sucesso',
      token,
      usuario
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Erro no rollback do registro:', rollbackError)
    }

    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Email ja cadastrado.' })
    }

    console.error('Erro no registro:', error)
    return res.status(500).json({ erro: 'Erro interno no servidor' })
  } finally {
    client.release()
  }
})

router.post('/login', async (req, res) => {
  try {
    const emailNormalizado = String(req.body.email || '').trim().toLowerCase()
    const senha = String(req.body.senha || '')

    if (!emailNormalizado || !senha) {
      return res.status(400).json({
        erro: 'Email e senha sao obrigatorios.'
      })
    }

    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [emailNormalizado]
    )

    if (resultado.rows.length === 0) {
      return res.status(400).json({ erro: 'Usuario nao encontrado.' })
    }

    const usuario = resultado.rows[0]
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)

    if (!senhaValida) {
      return res.status(400).json({ erro: 'Senha invalida.' })
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        plano: usuario.plano
      }
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return res.status(500).json({ erro: 'Erro interno no servidor' })
  }
})

router.post('/esqueci-senha', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()

    if (!email) {
      return res.status(400).json({ erro: 'Email e obrigatorio.' })
    }

    const usuarioResult = await pool.query(
      'SELECT id, email FROM usuarios WHERE email = $1 LIMIT 1',
      [email]
    )

    if (usuarioResult.rows.length === 0) {
      return res.json({
        mensagem: 'Se o email existir, um link de recuperacao sera gerado.'
      })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000)

    await pool.query(
      `
      UPDATE usuarios
      SET reset_token = $1,
          reset_token_expira = $2
      WHERE id = $3
      `,
      [token, expiraEm, usuarioResult.rows[0].id]
    )

    const resetLink = buildResetLink(req, token)

    if (isMailConfigured()) {
      await sendResetPasswordEmail({
        to: usuarioResult.rows[0].email,
        resetLink
      })

      return res.json({
        mensagem: 'Email de recuperacao enviado com sucesso.'
      })
    }

    return res.json({
      mensagem: 'Link gerado',
      reset_link: resetLink
    })
  } catch (error) {
    console.error('Erro ao gerar link de recuperacao:', error)
    return res.status(500).json({ erro: 'Erro interno no servidor' })
  }
})

router.post('/resetar-senha', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim()
    const novaSenha = String(req.body.nova_senha || '')

    if (!token || !novaSenha) {
      return res.status(400).json({
        erro: 'Token e nova senha sao obrigatorios.'
      })
    }

    const usuarioResult = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE reset_token = $1
      AND reset_token_expira IS NOT NULL
      AND reset_token_expira > NOW()
      LIMIT 1
      `,
      [token]
    )

    if (usuarioResult.rows.length === 0) {
      return res.status(400).json({ erro: 'Token invalido ou expirado.' })
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10)

    await pool.query(
      `
      UPDATE usuarios
      SET senha_hash = $1,
          reset_token = NULL,
          reset_token_expira = NULL
      WHERE id = $2
      `,
      [senhaHash, usuarioResult.rows[0].id]
    )

    return res.json({ mensagem: 'Senha atualizada com sucesso.' })
  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return res.status(500).json({ erro: 'Erro interno no servidor' })
  }
})

module.exports = router
