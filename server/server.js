require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const produtosRoutes = require('./routes/produtos')
const calculoRoutes = require('./routes/calculoRoutes')
const analiseRoutes = require('./routes/analiseRoutes')

app.use('/produtos', produtosRoutes)
app.use('/calculo', calculoRoutes)
app.use('/analise', analiseRoutes)

app.listen(3000, () => {
  console.log('🚀 Servidor rodando na porta 3000')
})