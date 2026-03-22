const pool = require('./db');

async function checkSchema() {
  try {
    console.log('=== VERIFICANDO SCHEMA ===\n');
    
    // Listar todas as tabelas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('TABELAS EXISTENTES:');
    tablesResult.rows.forEach(r => console.log('  -', r.table_name));
    
    // Verificar colunas de produto_fornecedor
    console.log('\nCOLUNAS DA TABELA "produto_fornecedor":');
    const pfResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'produto_fornecedor' 
      ORDER BY ordinal_position
    `);
    
    if (pfResult.rows.length > 0) {
      pfResult.rows.forEach(r => {
        const nullable = r.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        console.log(`  - ${r.column_name}: ${r.data_type} ${nullable}`);
      });
    } else {
      console.log('  ⚠️  TABELA NÃO ENCONTRADA!');
    }
    
    // Verificar migrations que foram rodadas
    console.log('\nMIGRATIONS APLICADAS:');
    try {
      const migrationsResult = await pool.query(`
        SELECT name, run_on 
        FROM pgmigrations 
        ORDER BY run_on DESC 
        LIMIT 10
      `);
      if (migrationsResult.rows.length > 0) {
        migrationsResult.rows.forEach(r => console.log(`  - ${r.name} (${r.run_on})`));
      } else {
        console.log('  ⚠️  Nenhuma migration registrada!');
      }
    } catch (err) {
      console.log('  ⚠️  Tabela pgmigrations não encontrada');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
