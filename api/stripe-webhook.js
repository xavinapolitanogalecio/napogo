import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

function leerRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).send('Missing stripe-signature header')

  let rawBody
  try {
    rawBody = await leerRawBody(req)
  } catch (err) {
    return res.status(400).send(`Error reading body: ${err.message}`)
  }

  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_DASHBOARD,
  ].filter(Boolean)

  let event
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret)
      break
    } catch (_) {}
  }

  if (!event) return res.status(400).send('Webhook Error: Invalid signature')

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    let email = session.customer_email ?? session.customer_details?.email ?? null

    if (!email && session.customer) {
      try {
        const customer = await stripe.customers.retrieve(session.customer)
        email = customer.deleted ? null : customer.email
      } catch (_) {}
    }

    const nombre     = session.customer_details?.name ?? ''
    const totalEuros = ((session.amount_total ?? 0) / 100).toFixed(2)

    fetch('https://projecto-xavi-n8n.rwydk6.easypanel.host/webhook/webhook/stripe-facturacion', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:             email ?? '',
        nombre,
        total:             totalEuros,
        moneda:            session.currency?.toUpperCase() ?? 'EUR',
        stripe_session_id: session.id,
      }),
    }).catch(() => {})

    if (email) {
      await supabase
        .from('profiles')
        .update({ suscripcion_activa: true })
        .eq('correo', email)
    }
  }

  return res.json({ received: true })
}
