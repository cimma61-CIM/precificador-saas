const express = require('express')
const router = express.Router()
const pool = require('../db')
const multer = require('multer')
const {
  adicionarItemCompra,
  criarCompra,
  atualizarCompra
} = require('../services/comprasService')
const {
  confirmarImportacao,
  createValidationError
} = require('../services/importacaoService')

const uploadXml = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    const extension = String(file.originalname || '').toLowerCase()
    const mimetype = String(file.mimetype || '').toLowerCase()
    const allowedMimeTypes = new Set(['text/xml', 'application/xml'])

    if (!extension.endsWith('.xml') || !allowedMimeTypes.has(mimetype)) {
      return cb(createValidationError('Envie um arquivo .xml valido'))
    }

    return cb(null, true)
  }
})

function normalizarId(valor) {
  const numero = Number.parseInt(valor, 10)
  return Number.isInteger(numero) && numero > 0 ? numero : null
}

function formatarCompra(compra) {
  if (!compra) {
    return null
  }

  return {
    ...compra,
    total_itens: Number(compra.total_itens || 0)
  }
}

function formatarItemCompra(item) {
  return {
    ...item,
    quantidade: Number(item.quantidade || 0),
    custo_unitario: Number(item.custo_unitario || 0),
    produto_quantidade_atual: item.produto_quantidade_atual === null
      ? null
      : Number(item.produto_quantidade_atual || 0),
    produto_custo_atual: item.produto_custo_atual === null
      ? null
      : Number(item.produto_custo_atual || 0)
  }
}

function handleXmlUpload(req, res, next) {
  uploadXml.single('arquivo')(req, res, (error) => {
    if (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ erro: error.message })
      }

      if (error instanceof multer.MulterError) {
        return res.status(400).json({ erro: 'Falha ao processar o arquivo enviado' })
      }

      return next(error)
    }

    if (!req.file) {
      return res.status(400).json({ erro: 'Arquivo XML e obrigatorio' })
    }

    return next()
  })
}

router.post('/', async (req, res) => {
  const usuarioId = req.user.id

  try {
    const resultado = await criarCompra(usuarioId, req.body || {})
    return res.status(201).json(resultado)
  } catch (error) {
    console.error(error)

    if (['Fornecedor e obrigatorio', 'Data da compra invalida', 'Contato_id invalido', 'Fornecedor_id invalido', 'Contato nao encontrado', 'Contato deve ser fornecedor ou ambos'].includes(error.message)) {
      return res.status(400).json({ erro: error.message })
    }

    return res.status(500).json({ erro: 'Erro ao criar compra' })
  }
})

router.post('/:id/itens', async (req, res) => {
  const usuarioId = req.user.id
  const compraId = normalizarId(req.params.id)

  if (!compraId) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const resultado = await adicionarItemCompra(usuarioId, compraId, req.body || {})
    return res.status(201).json(resultado)
  } catch (error) {
    console.error(error)

    const mensagens400 = new Set([
      'Compra nao encontrada',
      'Produto invalido',
      'Produto nao encontrado',
      'Quantidade deve ser um inteiro maior que zero',
      'Custo unitario deve ser um numero valido'
    ])

    if (mensagens400.has(error.message)) {
      return res.status(error.message === 'Compra nao encontrada' || error.message === 'Produto nao encontrado' ? 404 : 400).json({
        erro: error.message
      })
    }

    return res.status(500).json({ erro: 'Erro ao adicionar item da compra' })
  }
})

router.post('/importar-xml-confirmado', handleXmlUpload, async (req, res, next) => {
  try {
    const resultado = await confirmarImportacao(req.user.id, req.file)
    return res.json(resultado)
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ erro: error.message })
    }

    return next(error)
  }
})

router.get('/', async (req, res) => {
  const usuarioId = req.user.id

  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.usuario_id,
        c.data,
        ct.nome AS fornecedor,
        c.fornecedor_id,
        c.created_at,
        COUNT(ci.id)::int AS total_itens
      FROM compras c
      LEFT JOIN compras_itens ci
        ON ci.compra_id = c.id
      LEFT JOIN contatos ct
        ON ct.id = c.fornecedor_id
      WHERE c.usuario_id = $1
      GROUP BY c.id, c.usuario_id, c.data, c.fornecedor_id, ct.nome, c.created_at
      ORDER BY c.data DESC, c.id DESC
      `,
      [usuarioId]
    )

    return res.json({
      compras: result.rows.map(formatarCompra)
    })
  } catch (error) {
    console.error('GET /compras error:', error)
    return res.status(500).json({ erro: error.message || 'Erro ao listar compras' })
  }
})

router.get('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const compraId = normalizarId(req.params.id)

  if (!compraId) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const compraResult = await pool.query(
      `
      SELECT
        c.id,
        c.usuario_id,
        c.data,
        ct.nome AS fornecedor_nome,
        c.fornecedor_id,
        c.created_at,
        COUNT(ci.id)::int AS total_itens
      FROM compras c
      LEFT JOIN compras_itens ci
        ON ci.compra_id = c.id
      LEFT JOIN contatos ct
        ON ct.id = c.fornecedor_id
      WHERE c.id = $1
        AND c.usuario_id = $2
      GROUP BY c.id, c.usuario_id, c.data, c.fornecedor_id, ct.nome, c.created_at
      LIMIT 1
      `,
      [compraId, usuarioId]
    )

    if (!compraResult.rows.length) {
      return res.status(404).json({ erro: 'Compra nao encontrada' })
    }

    const itensResult = await pool.query(
      `
      SELECT
        ci.id,
        ci.compra_id,
        ci.produto_id,
        ci.quantidade,
        ci.custo_unitario,
        p.sku AS produto_sku,
        p.nome AS produto_nome,
        COALESCE(NULLIF(TRIM(p.ean), ''), NULLIF(TRIM(p.barcode), '')) AS produto_ean,
        p.quantidade AS produto_quantidade_atual,
        p.custo AS produto_custo_atual
      FROM compras_itens ci
      INNER JOIN produtos p
        ON p.id = ci.produto_id
      WHERE ci.compra_id = $1
        AND p.usuario_id = $2
      ORDER BY ci.id ASC
      `,
      [compraId, usuarioId]
    )

    return res.json({
      compra: formatarCompra(compraResult.rows[0]),
      itens: itensResult.rows.map(formatarItemCompra)
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: 'Erro ao buscar compra' })
  }
})

router.put('/:id', async (req, res) => {
  const usuarioId = req.user.id
  const compraId = normalizarId(req.params.id)

  if (!compraId) {
    return res.status(400).json({ erro: 'ID invalido' })
  }

  try {
    const resultado = await atualizarCompra(usuarioId, compraId, req.body || {})
    return res.json(resultado)
  } catch (error) {
    console.error(error)

    const mensagens400 = new Set([
      'Compra nao encontrada',
      'Produto invalido',
      'Produto nao encontrado',
      'Quantidade deve ser um inteiro maior que zero',
      'Custo unitario deve ser um numero valido',
      'Contato_id invalido',
      'Fornecedor_id invalido',
      'Contato nao encontrado',
      'Contato deve ser fornecedor ou ambos'
    ])

    if (mensagens400.has(error.message)) {
      return res.status(error.message === 'Compra nao encontrada' || error.message === 'Produto nao encontrado' ? 404 : 400).json({
        erro: error.message
      })
    }

    return res.status(500).json({ erro: error.message || 'Erro ao atualizar compra' })
  }
})

module.exports = router
