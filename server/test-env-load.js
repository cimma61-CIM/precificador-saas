// TESTE: Verificar se .env é carregado corretamente

require('./config/loadEnv')

console.log('\n=== TESTE: Carregamento do .env ===\n')

// Verificar o que foi carregado
const vars = {
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET ? 'DEFINIDO' : 'VAZIO',
  PORT: process.env.PORT
}

console.log(JSON.stringify(vars, null, 2))

console.log('\n=== RESULTADO ===')
if (process.env.DB_USER && process.env.JWT_SECRET) {
  console.log('✅ SUCESSO: Variáveis carregadas de /server/.env')
  process.exit(0)
} else {
  console.log('❌ ERRO: Variáveis não foram carregadas')
  console.log('Procurar .env em:')
  console.log('  1.' + require('path').resolve(__dirname, '..', '..', '.env'))
  console.log('  2.' + require('path').resolve(__dirname, '..', '.env'))
  console.log('  3.' + require('path').resolve(process.cwd(), '.env'))
  process.exit(1)
}
