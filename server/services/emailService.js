const nodemailer = require('nodemailer')

function getMailConfig() {
  const host = String(process.env.SMTP_HOST || '').trim()
  const port = Number(process.env.SMTP_PORT || 0)
  const user = String(process.env.SMTP_USER || '').trim()
  const pass = String(process.env.SMTP_PASS || '').trim()
  const from = String(process.env.SMTP_FROM || '').trim()

  return {
    host,
    port,
    user,
    pass,
    from
  }
}

function isMailConfigured() {
  const config = getMailConfig()

  return Boolean(
    config.host &&
      config.port > 0 &&
      config.user &&
      config.pass &&
      config.from
  )
}

function createTransporter() {
  const config = getMailConfig()

  if (!isMailConfigured()) {
    throw new Error('SMTP nao configurado.')
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    }
  })
}

async function sendResetPasswordEmail({ to, resetLink }) {
  const transporter = createTransporter()
  const { from } = getMailConfig()

  await transporter.sendMail({
    from,
    to,
    subject: 'Recuperacao de senha - Precificador SaaS',
    html: `
      <div style="font-family: Arial, sans-serif; color: #102033; line-height: 1.5;">
        <h2>Recuperacao de senha</h2>
        <p>Recebemos uma solicitacao para redefinir sua senha.</p>
        <p>
          <a
            href="${resetLink}"
            style="display:inline-block;padding:12px 18px;background:#0f62fe;color:#ffffff;text-decoration:none;border-radius:8px;"
          >
            Redefinir senha
          </a>
        </p>
        <p>Se preferir, copie e cole este link no navegador:</p>
        <p>${resetLink}</p>
        <p>Este link expira em 1 hora.</p>
      </div>
    `
  })
}

module.exports = {
  isMailConfigured,
  sendResetPasswordEmail
}
