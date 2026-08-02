exports.up = async (pgm) => {
  // tipos_contato
  pgm.createTable('tipos_contato', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    nome: {
      type: 'varchar(100)',
      notNull: true,
      unique: true
    },
    criado_em: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  })

  // contatos
  pgm.createTable('contatos', {
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
    fantasia: {
      type: 'varchar(255)'
    },
    tipo_pessoa: {
      type: 'varchar(2)',
      notNull: true
    },
    documento: {
      type: 'varchar(20)',
      notNull: true
    },
    email: {
      type: 'varchar(255)'
    },
    telefone: {
      type: 'varchar(20)'
    },
    criado_em: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    atualizado_em: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  })

  // relação N:N
  pgm.createTable('contato_tipos', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    contato_id: {
      type: 'integer',
      notNull: true,
      references: 'contatos',
      onDelete: 'CASCADE'
    },
    tipo_id: {
      type: 'integer',
      notNull: true,
      references: 'tipos_contato',
      onDelete: 'CASCADE'
    }
  })

  // índices
  pgm.createIndex('contatos', ['usuario_id'])
  pgm.createIndex('contatos', ['documento'])
  pgm.createIndex('contatos', ['email'])

  pgm.createIndex('contato_tipos', ['contato_id'])
  pgm.createIndex('contato_tipos', ['tipo_id'])

  // seed inicial
  pgm.sql(`
    INSERT INTO tipos_contato (nome)
    VALUES ('Cliente'), ('Fornecedor'), ('Vendedor')
    ON CONFLICT (nome) DO NOTHING;
  `)
}

exports.down = (pgm) => {
  pgm.dropTable('contato_tipos', { ifExists: true })
  pgm.dropTable('contatos', { ifExists: true })
  pgm.dropTable('tipos_contato', { ifExists: true })
}