exports.up = async (pgm) => {
  pgm.createTable('anuncios', {
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
    produto_id: {
      type: 'integer',
      notNull: true,
      references: 'produtos',
      onDelete: 'CASCADE'
    },
    marketplace_id: {
      type: 'integer',
      notNull: true,
      references: 'marketplaces'
    },
    sku_anuncio: {
      type: 'varchar(255)',
      notNull: true
    },
    titulo: {
      type: 'varchar(255)'
    },
    preco: {
      type: 'numeric(10,2)',
      notNull: true
    },
    estoque: {
      type: 'integer',
      notNull: true
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ativo'
    },
    tem_ads: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    full: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    em_promocao: {
      type: 'boolean',
      notNull: true,
      default: false
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

  pgm.createIndex('anuncios', ['usuario_id'])
  pgm.createIndex('anuncios', ['produto_id'])
  pgm.createIndex('anuncios', ['marketplace_id'])
  pgm.createIndex('anuncios', ['usuario_id', 'status'])

  pgm.addConstraint('anuncios', 'anuncios_usuario_marketplace_sku_unique', {
    unique: ['usuario_id', 'marketplace_id', 'sku_anuncio']
  })

  pgm.addConstraint('anuncios', 'anuncios_preco_positive', {
    check: 'preco > 0'
  })

  pgm.addConstraint('anuncios', 'anuncios_estoque_non_negative', {
    check: 'estoque >= 0'
  })

  pgm.addConstraint('anuncios', 'anuncios_status_valid', {
    check: "status IN ('ativo', 'pausado', 'sem_estoque')"
  })
}

exports.down = (pgm) => {
  pgm.dropTable('anuncios', { ifExists: true })
}
