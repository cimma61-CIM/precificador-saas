function formatDatePart(value) {
  return String(value).padStart(2, '0')
}

function getTimestamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = formatDatePart(now.getMonth() + 1)
  const day = formatDatePart(now.getDate())
  const hours = formatDatePart(now.getHours())
  const minutes = formatDatePart(now.getMinutes())

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatMessage(level, message) {
  return `[${getTimestamp()}] ${level} ${message}`
}

function info(message, ...meta) {
  console.log(formatMessage('INFO', message), ...meta)
}

function warn(message, ...meta) {
  console.warn(formatMessage('WARN', message), ...meta)
}

function error(message, ...meta) {
  console.error(formatMessage('ERROR', message), ...meta)
}

module.exports = {
  info,
  warn,
  error
}
