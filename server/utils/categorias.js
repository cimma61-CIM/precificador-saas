function normalizarNomeCategoria(valor) {
  return String(valor || '').trim().replace(/\s+/g, ' ')
}

function slugifyCategoria(valor) {
  return normalizarNomeCategoria(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizarChaveCategoria(valor) {
  return slugifyCategoria(valor)
}

module.exports = {
  normalizarChaveCategoria,
  normalizarNomeCategoria,
  slugifyCategoria
}
