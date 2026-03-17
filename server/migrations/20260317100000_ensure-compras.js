const fs = require('fs')
const path = require('path')

exports.up = async (pgm) => {
  const sqlPath = path.join(__dirname, '..', 'sql', 'ensure_compras.sql')
  pgm.sql(fs.readFileSync(sqlPath, 'utf8'))
}

exports.down = false
