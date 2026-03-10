require('./config/loadEnv')

const pool = require('./db')
const { normalizarMarketplace } = require('./services/precoService')

const marketplacesPadrao = [
  'Mercado Livre',
  'Shopee',
  'Amazon',
  'Magalu'
]

async function seedMarketplaces() {
  try {
    for (const nome of marketplacesPadrao) {
      const slug = normalizarMarketplace(nome)

      await pool.query(
        `
        INSERT INTO marketplaces (nome, slug)
        VALUES ($1, $2)
        ON CONFLICT (slug)
        DO UPDATE SET nome = EXCLUDED.nome
        `,
        [nome, slug]
      )
    }

    console.log('Marketplaces padrao sincronizados com sucesso!')
  } catch (err) {
    console.error('Erro ao popular marketplaces padrao:', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

seedMarketplaces()
