function detectarSeparador(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length
  const semicolons = (headerLine.match(/;/g) || []).length
  return semicolons > commas ? ';' : ','
}

function splitCsvLine(line, separator) {
  const values = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"'
        index += 1
        continue
      }

      insideQuotes = !insideQuotes
      continue
    }

    if (char === separator && !insideQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function parseCsv({ buffer }) {
  const content = String(buffer || '').replace(/^\uFEFF/, '').trim()

  if (!content) {
    throw new Error('Arquivo CSV vazio ou invalido')
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim())

  if (lines.length < 2) {
    throw new Error('CSV sem dados suficientes')
  }

  const separator = detectarSeparador(lines[0])
  const headers = splitCsvLine(lines[0], separator).map((header) => String(header || '').trim().toLowerCase())

  return lines.slice(1).map((line, index) => {
    const columns = splitCsvLine(line, separator)
    const row = {}

    headers.forEach((header, columnIndex) => {
      row[header] = columns[columnIndex] || ''
    })

    return {
      linha: index + 2,
      sku: row.sku,
      nome: row.nome,
      ean: row.ean,
      custo: row.custo,
      preco_venda: row.preco_venda,
      margem_desejada: row.margem_desejada ?? row.margem,
      categoria: row.categoria
    }
  })
}

module.exports = parseCsv
