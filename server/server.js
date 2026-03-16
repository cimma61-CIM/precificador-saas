require('./config/loadEnv')
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const pool = require('./db')

const produtosRoutes = require('./routes/produtos')
const calculoRoutes = require('./routes/calculoRoutes')
const analiseRoutes = require('./routes/analiseRoutes')
const taxasRoutes = require('./routes/taxasRoutes')
const marketplacesRoutes = require('./routes/marketplacesRoutes')
const authRoutes = require('./routes/authRoutes')
const categoriasRoutes = require('./routes/categorias')
const importacaoRoutes = require('./routes/importacaoRoutes')
const ncmRoutes = require('./routes/ncm')
const authMiddleware = require('./middleware/auth')
const errorHandler = require('./middleware/errorHandler')
const logger = require('./utils/logger')

const app = express()
const PORT = process.env.PORT || 3000
const clientPath = path.join(__dirname, '..', 'client')
const ensureCategoriasSqlPath = path.join(__dirname, 'sql', 'ensure_categorias.sql')
const ensureProdutosCategoriaIdSqlPath = path.join(__dirname, 'sql', 'ensure_produtos_categoria_id.sql')
const ensureProdutosEanSqlPath = path.join(__dirname, 'sql', 'ensure_produtos_ean.sql')

async function ensureSqlFile(filePath, successMessage, errorMessage) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8')
    await pool.query(sql)
    logger.info(successMessage)
  } catch (error) {
    logger.error(errorMessage, error)
  }
}

app.use(cors())
app.use(express.json())
app.use(express.static(clientPath))

app.get('/api', (req, res) => {
  res.json({ mensagem: 'Precificador SaaS API rodando' })
})

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'))
})

app.get('/produtos', (req, res, next) => {
  const acceptHeader = String(req.headers.accept || '').toLowerCase()

  if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
    return res.sendFile(path.join(clientPath, 'produtos.html'))
  }

  return next()
})

app.get('/produtos/novo', (req, res) => {
  res.sendFile(path.join(clientPath, 'produtos-novo.html'))
})

app.use('/auth', authRoutes)
app.use('/marketplaces', authMiddleware, marketplacesRoutes)
app.use('/categorias', authMiddleware, categoriasRoutes)
app.use('/ncm', authMiddleware, ncmRoutes)
app.use('/produtos', authMiddleware, importacaoRoutes)
app.use('/produtos', authMiddleware, produtosRoutes)
app.use('/taxas', authMiddleware, taxasRoutes)
app.use('/calcular-preco', authMiddleware, calculoRoutes)
app.use('/analise', authMiddleware, analiseRoutes)
app.use(errorHandler)

async function startServer() {
  await ensureSqlFile(
    ensureCategoriasSqlPath,
    'Tabela categorias verificada com sucesso.',
    'Falha ao garantir a tabela categorias:'
  )

  await ensureSqlFile(
    ensureProdutosCategoriaIdSqlPath,
    'Coluna produtos.categoria_id verificada com sucesso.',
    'Falha ao garantir a coluna produtos.categoria_id:'
  )

  await ensureSqlFile(
    ensureProdutosEanSqlPath,
    'Coluna produtos.ean verificada com sucesso.',
    'Falha ao garantir a coluna produtos.ean:'
  )

  const server = app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Porta ${PORT} ja esta em uso. Ajuste a variavel PORT no arquivo .env ou finalize o processo atual.`)
      process.exit(1)
    }

    logger.error('Erro ao iniciar o servidor:', error)
    process.exit(1)
  })
}

startServer().catch((error) => {
  logger.error('Erro inesperado ao iniciar o servidor:', error)
})
