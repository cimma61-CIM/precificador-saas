const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

/**
 * Procura por arquivo .env com variáveis reais definidas.
 * Estratégia: Sobe a hierarquia, e em cada nível também procura em um
 * possível diretório "server/" e "server./env" (para compatibilidade com
 * estrutura de projeto e worktrees).
 */
function findEnvFile(startDir, maxLevels = 15) {
  let currentDir = startDir
  let levels = 0

  while (levels < maxLevels) {
    // Lista de caminhos para tentar em cada nível
    const pathsToTry = [
      path.join(currentDir, '.env'),
      path.join(currentDir, 'server', '.env'),  // fallback para server/.env
      path.join(currentDir, '.env.local'),      // .env.local também aceito
    ]

    for (const envPath of pathsToTry) {
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf8').trim()
          
          // Verificar se tem pelo menos uma variável definida real (CHAVE=valor)
          const lines = content.split('\n')
          const hasRealVariables = lines.some(line => {
            const trimmed = line.trim()
            return trimmed && !trimmed.startsWith('#') && trimmed.includes('=')
          })

          if (hasRealVariables) {
            return envPath
          }
        } catch (err) {
          // Se não conseguir ler, continua procurando
        }
      }
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      // Chegou à raiz do sistema de arquivos
      break
    }

    currentDir = parentDir
    levels++
  }

  return null
}

/**
 * ESTRATÉGIA DE CARREGAMENTO FINAL:
 * 1. Procura para cima a partir de __dirname até encontrar .env com variáveis reais
 * 2. Fallback: process.cwd()/.env
 * 3. Sem arquivo .env: usa valores default (ou deixa undefined)
 */

let loadedFrom = null
let envPath = findEnvFile(__dirname)

if (!envPath) {
  // Fallback 1: Procurar no diretório de execução
  const cwdEnvPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(cwdEnvPath)) {
    try {
      const content = fs.readFileSync(cwdEnvPath, 'utf8').trim()
      const lines = content.split('\n')
      const hasRealVariables = lines.some(line => {
        const trimmed = line.trim()
        return trimmed && !trimmed.startsWith('#') && trimmed.includes('=')
      })
      if (hasRealVariables) {
        envPath = cwdEnvPath
      }
    } catch (err) {
      // Se não conseguir ler, continua
    }
  }
}

// Carregar o arquivo .env se encontrado
if (envPath) {
  dotenv.config({ path: envPath })
  loadedFrom = envPath
}

// Debug (comentado em produção)
if (process.env.DEBUG_ENV === 'true') {
  console.log(`[loadEnv] Carregado de: ${loadedFrom || 'nenhum arquivo .env com dados encontrado'}`)
}
