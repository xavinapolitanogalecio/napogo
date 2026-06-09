import 'dotenv/config'
import express from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { createRequire } from 'module'

// raw-body es CJS — lo importamos con createRequire para compatibilidad ESM
const require    = createRequire(import.meta.url)
const getRawBody = require('raw-body')

const app  = express()
const port = process.env.PORT ?? 3001

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ─── Webhook de Stripe ──────────────────────────────────────────────────────
// getRawBody lee directamente del stream de la petición sin pasar por
// ningún middleware de Express. Es la forma más fiable de obtener el
// raw body que Stripe necesita para verificar la firma.
app.post('/api/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']

  if (!sig) {
    return res.status(400).send('Webhook Error: Missing stripe-signature header')
  }

  let rawBody
  try {
    rawBody = await getRawBody(req, { limit: '1mb' })
  } catch (err) {
    console.error('❌ Error leyendo body:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Acepta eventos firmados por cualquiera de los dos secrets:
  // CLI (stripe listen) y Dashboard (ngrok) pueden coexistir sin conflicto.
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_DASHBOARD,
  ].filter(Boolean)

  let event
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret)
      break
    } catch (_) {
      // prueba el siguiente secret
    }
  }

  if (!event) {
    console.error('❌ Firma inválida con todos los secrets configurados')
    return res.status(400).send('Webhook Error: Invalid signature')
  }

  console.log(`✅ Evento recibido: ${event.type}`)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    let email =
      session.customer_email ??
      session.customer_details?.email ??
      null

    if (!email && session.customer) {
      const customer = await stripe.customers.retrieve(session.customer)
      email = customer.deleted ? null : customer.email
    }

    console.log(`📧 Email extraído del evento: ${email ?? 'ninguno'}`)

    // ── Notificar n8n SIEMPRE (antes de cualquier return) ───────────────
    const nombre      = session.customer_details?.name ?? ''
    const totalEuros  = ((session.amount_total ?? 0) / 100).toFixed(2)
    const n8nPayload  = {
      email:             email ?? '',
      nombre,
      total:             totalEuros,
      moneda:            session.currency?.toUpperCase() ?? 'EUR',
      stripe_session_id: session.id,
    }
    console.log('📤 Enviando a n8n:', JSON.stringify(n8nPayload))
    fetch('https://projecto-xavi-n8n.rwydk6.easypanel.host/webhook/webhook/stripe-facturacion', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(n8nPayload),
    })
      .then(r => console.log(`📨 n8n respondió HTTP ${r.status}`))
      .catch(err => console.error('⚠️  Error notificando n8n:', err.message))

    // ── Actualizar Supabase solo si hay email ────────────────────────────
    if (!email) {
      console.warn('⚠️  Sin email — Supabase no actualizado')
      return res.json({ received: true })
    }

    const { error, count } = await supabase
      .from('profiles')
      .update({ suscripcion_activa: true })
      .eq('correo', email)
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Error Supabase:', error.message)
      return res.status(500).json({ error: error.message })
    }

    console.log(count > 0
      ? `🎉 suscripcion_activa=true → ${email}`
      : `⚠️  Pago OK pero no hay perfil para: ${email}`,
    )
  }

  res.json({ received: true })
})

// ─── JSON para el resto de rutas — SIEMPRE después del webhook ───────────────
app.use(express.json())

// ─── Archivos estáticos (producción) ────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const distPath  = join(__dirname, 'dist')

if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/{*path}', (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

app.listen(port, () => {
  console.log(`🚀 Servidor en http://localhost:${port}`)
})
