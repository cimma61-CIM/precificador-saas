const fs = require('fs')
const path = require('path')
const pool = require('./db')

async function fixSchema() {
  try {
    console.log('🔧 Iniciando correção do schema...\n')

    const sqlPath = path.join(__dirname, 'sql', 'fix_produto_fornecedor.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📝 Executando SQL...')
    await pool.query(sql)

    console.log('✅ Schema corrigido com sucesso!\n')

    console.log('📋 Verificando resultado...')
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'produto_fornecedor' 
      ORDER BY ordinal_position
    `)

    console.log('\nCOLUNAS ATUALIZADAS:')
    result.rows.forEach(r => {
      const nullable = r.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'
      console.log(`  ✓ ${r.column_name}: ${r.data_type} ${nullable}`)
    })

    process.exit(0)
  } catch (err) {
    console.error('❌ ERRO:', err.message)
    console.error(err)
    process.exit(1)
  }
}

fixSchema()
