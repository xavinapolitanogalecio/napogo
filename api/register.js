import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const RESEND_KEY = process.env.RESEND_API_KEY
const APP_URL    = process.env.VITE_APP_URL || 'https://napogo.vercel.app'

const ERRORES_ES = {
  'already registered':       'Ya existe una cuenta con ese correo',
  'already been registered':  'Ya existe una cuenta con ese correo',
  'User already exists':      'Ya existe una cuenta con ese correo',
}
function traducir(msg = '') {
  for (const [k, v] of Object.entries(ERRORES_ES)) if (msg.includes(k)) return v
  return msg
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password, nombre, tiendas } = req.body ?? {}
  if (!email || !password || !nombre || !Array.isArray(tiendas)) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' })
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { nombre: nombre.trim(), tiendas },
        redirectTo: APP_URL,
      },
    })
    if (error) return res.status(400).json({ error: traducir(error.message) })

    const confirmUrl = data.properties?.action_link
    if (!confirmUrl) return res.status(500).json({ error: 'No se pudo generar el enlace de confirmación' })

    const primerNombre = nombre.trim().split(' ')[0]

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'NapoGo <noreply@naposystem.com>',
        to: [email.trim()],
        subject: 'Confirma tu cuenta en NapoGo',
        html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header azul -->
        <tr><td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 32px 24px;text-align:center;">
          <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="color:white;font-size:24px;font-weight:900;">N</span>
          </div>
          <h1 style="margin:0;color:white;font-size:22px;font-weight:800;">NapoGo</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Tu asistente de repartos</p>
        </td></tr>
        <!-- Cuerpo -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">¡Hola, <strong>${primerNombre}</strong>! 👋</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Gracias por registrarte en NapoGo. Confirma tu cuenta haciendo clic en el botón:
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${confirmUrl}"
               style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
              Confirmar mi cuenta →
            </a>
          </div>
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
            Si no has creado esta cuenta, ignora este correo.<br>
            El enlace expira en 24 horas.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">NapoGo · Tu asistente de repartos</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    })

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}))
      throw new Error(errData.message || `Resend error ${emailRes.status}`)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
