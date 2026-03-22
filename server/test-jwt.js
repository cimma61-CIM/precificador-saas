require('./config/loadEnv')
const jwt = require('jsonwebtoken')

// Teste de JWT_SECRET
const jwtSecret = process.env.JWT_SECRET

console.log('\n=== TESTE JWT_SECRET ===\n')

if (!jwtSecret) {
  console.error('❌ ERRO: JWT_SECRET não está configurado!')
  process.exit(1)
}

console.log('✅ JWT_SECRET está configurado:', jwtSecret.slice(0, 20) + '...')

try {
  const token = jwt.sign(
    { id: 1, email: 'test@example.com' },
    jwtSecret,
    { expiresIn: '7d' }
  )
  console.log('✅ Token JWT gerado com sucesso')
  console.log('   Token sample:', token.slice(0, 50) + '...')

  const decoded = jwt.verify(token, jwtSecret)
  console.log('✅ Token JWT verificado com sucesso')
  console.log('   Dados:', JSON.stringify(decoded, null, 2))

  console.log('\n✅ JWT_SECRET funciona perfeitamente!\n')
  process.exit(0)
} catch (err) {
  console.error('❌ ERRO com JWT:', err.message)
  process.exit(1)
}
