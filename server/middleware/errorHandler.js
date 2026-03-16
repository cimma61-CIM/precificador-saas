const logger = require('../utils/logger')

function errorHandler(err, req, res, next) {
  logger.error(
    `Erro nao tratado em ${req.method} ${req.originalUrl || req.url || ''}`,
    err
  )

  if (res.headersSent) {
    return next(err)
  }

  return res.status(500).json({
    erro: 'Erro interno no servidor'
  })
}

module.exports = errorHandler
