exports.up = async (pgm) => {
  // Criar tabela contatos com schema simples
  pgm.createTable('contatos', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    nome: {
      type: 'varchar(255)',
      notNull: true
    },
    tipo: {
      type: 'varchar(20)',
      notNull: true,
      check: "tipo IN ('cliente', 'fornecedor', 'ambos')"
    },
    documento: {
      type: 'varchar(50)'
    },
    telefone: {
      type: 'varchar(50)'
    },
    email: {
      type: 'varchar(255)'
    },
    observacoes: {
      type: 'text'
    },
    usuario_id: {
      type: 'integer',
      notNull: true,
      references: { name: 'usuarios', field: 'id' },
      onDelete: 'CASCADE'
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
  }, { ifNotExists: true })

  // Criar índices para melhor performance
  pgm.createIndex('contatos', ['usuario_id'], {
    name: 'idx_contatos_usuario_id'
  })

  pgm.createIndex('contatos', ['usuario_id', 'criado_em'], {
    name: 'idx_contatos_usuario_criado_em'
  })

  pgm.createIndex('contatos', ['tipo'], {
    name: 'idx_contatos_tipo'
  })
}

exports.down = (pgm) => {
  pgm.dropTable('contatos', { ifExists: true })
}
