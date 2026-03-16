const path = require('path')
const express = require('express')
const multer = require('multer')
const {
  analisarImportacao,
  buildTemplateWorkbook,
  confirmarImportacao,
  createValidationError
} = require('../services/importacaoService')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    const allowedMimeTypes = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'text/xml',
      'application/xml'
    ])
    const extension = path.extname(String(file.originalname || '')).toLowerCase()

    if (!['.xlsx', '.csv', '.xml'].includes(extension) || !allowedMimeTypes.has(file.mimetype)) {
      return cb(createValidationError('Envie um arquivo .xlsx, .csv ou .xml valido'))
    }

    return cb(null, true)
  }
})

function handleUpload(req, res, next) {
  upload.single('arquivo')(req, res, (error) => {
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
      return res.status(400).json({ erro: 'Arquivo de importacao e obrigatorio' })
    }

    return next()
  })
}

router.get('/modelo-importacao', async (req, res, next) => {
  try {
    const workbookBuffer = buildTemplateWorkbook()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="modelo-importacao-produtos.xlsx"'
    )

    return res.send(workbookBuffer)
  } catch (error) {
    return next(error)
  }
})

router.post('/importar', handleUpload, async (req, res, next) => {
  try {
    const resultado = await analisarImportacao(req.user.id, req.file)
    return res.json(resultado)
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ erro: error.message })
    }

    return next(error)
  }
})

router.post('/importar-confirmado', handleUpload, async (req, res, next) => {
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

module.exports = router
