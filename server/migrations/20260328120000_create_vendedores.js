exports.up = async (pgm) => {
  pgm.createTable('vendedores', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    usuario_id: {
      type: 'integer',
      notNull: true,
      references: 'usuarios',
      onDelete: 'CASCADE'
    },
    nome: {
      type: 'varchar(255)',
      notNull: true
    },
    email: {
      type: 'varchar(255)'
    },
    telefone: {
      type: 'varchar(50)'
    },
    ativo: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  })

  pgm.createIndex('vendedores', ['usuario_id'])
  pgm.createIndex('vendedores', ['usuario_id', 'ativo'])
}

exports.down = (pgm) => {
  pgm.dropTable('vendedores', { ifExists: true })
}
