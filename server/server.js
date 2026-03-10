require('./config/loadEnv')
const path = require('path')
const express = require('express')
const cors = require('cors')

const produtosRoutes = require('./routes/produtos')
const calculoRoutes = require('./routes/calculoRoutes')
const analiseRoutes = require('./routes/analiseRoutes')
const taxasRoutes = require('./routes/taxasRoutes')
const marketplacesRoutes = require('./routes/marketplacesRoutes')
const authRoutes = require('./routes/authRoutes')
const authMiddleware = require('./middleware/auth')

const app = express()
const PORT = process.env.PORT || 3000
const clientPath = path.join(__dirname, '..', 'client')

app.use(cors())
app.use(express.json())
app.use(express.static(clientPath))

app.get('/api', (req, res) => {
  res.json({ mensagem: 'Precificador SaaS API rodando' })
})

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'))
})

app.use('/auth', authRoutes)
app.use('/marketplaces', authMiddleware, marketplacesRoutes)
app.use('/produtos', authMiddleware, produtosRoutes)
app.use('/taxas', authMiddleware, taxasRoutes)
app.use('/calcular-preco', authMiddleware, calculoRoutes)
app.use('/analise', authMiddleware, analiseRoutes)

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} ja esta em uso. Ajuste a variavel PORT no arquivo .env ou finalize o processo atual.`)
    process.exit(1)
  }

  console.error('Erro ao iniciar o servidor:', error)
  process.exit(1)
})
