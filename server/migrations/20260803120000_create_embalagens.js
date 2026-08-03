exports.up = async (pgm) => {
  pgm.createTable('embalagens', {
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
    peso_kg: {
      type: 'numeric(10,3)',
      notNull: true
    },
    largura_cm: {
      type: 'numeric(10,2)',
      notNull: true
    },
    altura_cm: {
      type: 'numeric(10,2)',
      notNull: true
    },
    comprimento_cm: {
      type: 'numeric(10,2)',
      notNull: true
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

  pgm.createIndex('embalagens', ['usuario_id'])
  pgm.createIndex('embalagens', ['usuario_id', 'ativo'])

  pgm.addConstraint('embalagens', 'embalagens_peso_kg_positive', {
    check: 'peso_kg > 0'
  })

  pgm.addConstraint('embalagens', 'embalagens_largura_cm_positive', {
    check: 'largura_cm > 0'
  })

  pgm.addConstraint('embalagens', 'embalagens_altura_cm_positive', {
    check: 'altura_cm > 0'
  })

  pgm.addConstraint('embalagens', 'embalagens_comprimento_cm_positive', {
    check: 'comprimento_cm > 0'
  })
}

exports.down = (pgm) => {
  pgm.dropTable('embalagens', { ifExists: true })
}
