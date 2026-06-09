import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  // Stripe requiere el body raw (sin parsear) para verificar la firma
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Stripe signature verification failed:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 400 })
  }

  console.log(`Evento recibido: ${event.type}`)

  let email: string | null = null

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    // Stripe puede devolver el email en customer_email o customer_details
    email =
      session.customer_email ??
      session.customer_details?.email ??
      null

    // Si solo hay customer ID, recuperamos el email desde la API
    if (!email && session.customer) {
      const customer = await stripe.customers.retrieve(session.customer as string)
      if (!customer.deleted) {
        email = (customer as Stripe.Customer).email
      }
    }
  } else if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    // Solo activar si la suscripción está realmente activa
    if (subscription.status === 'active') {
      const customer = await stripe.customers.retrieve(
        subscription.customer as string,
      )
      if (!customer.deleted) {
        email = (customer as Stripe.Customer).email
      }
    }
  }

  if (email) {
    const { error, count } = await supabase
      .from('profiles')
      .update({ suscripcion_activa: true })
      .eq('correo', email)
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('Supabase update error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (count === 0) {
      // El usuario pagó pero todavía no tiene perfil (raro, pero posible)
      console.warn(`No se encontró perfil para el email: ${email}`)
    } else {
      console.log(`suscripcion_activa=true actualizado para: ${email}`)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
