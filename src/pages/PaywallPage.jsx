import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Actualiza estos 4 valores cuando tengas los links de Stripe ──────────────
const PLANES = {
  mensual: {
    stripeUrl: 'https://buy.stripe.com/test_7sY14nbEtdd09oc13Z9IQ01',
    precio:    '22 €',
    cadencia:  'al mes',
    detalle:   '22 € · facturado mensualmente',
  },
  anual: {
    stripeUrl: 'https://buy.stripe.com/test_8x228rgYN2ym1VK8wr9IQ02',
    precio:    '13 €',
    cadencia:  'al mes',
    detalle:   '155 € · facturado una vez al año',
    ahorro:    'Ahorra 41%',
  },
}
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📦', texto: 'Dashboard completo de repartos por tienda' },
  { icon: '📊', texto: 'Historial ilimitado sincronizado en la nube' },
  { icon: '🤖', texto: 'Asistente IA con registro por voz' },
  { icon: '📄', texto: 'Exportar resumen mensual en PDF' },
  { icon: '📱', texto: 'App instalable en tu móvil' },
  { icon: '🔄', texto: 'Modo offline — funciona sin conexión' },
]

export default function PaywallPage({ session, onSubscribed }) {
  const [plan, setPlan]         = useState('anual')
  const [checking, setChecking] = useState(false)
  const [error, setError]       = useState(null)

  const planActual = PLANES[plan]

  async function handleLogout() { await supabase.auth.signOut() }

  async function handleVerificar() {
    setChecking(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('profiles').select('suscripcion_activa').eq('id', session.user.id).single()
      if (err) throw err
      if (data?.suscripcion_activa) {
        onSubscribed()
      } else {
        setError('Todavía no detectamos tu pago. Si acabas de pagar, espera unos segundos e inténtalo de nuevo.')
      }
    } catch {
      setError('Error al comprobar la suscripción. Inténtalo de nuevo.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
            <span className="text-white font-black text-xl select-none">N</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">NapoGo</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-6">
          {[
            { n: 1, label: 'Cuenta', done: true },
            { n: 2, label: 'Perfil',  done: true },
            { n: 3, label: 'Activar', done: false, active: true },
          ].map(({ n, label, done, active }) => (
            <div key={n} className="flex items-center gap-1.5">
              {n > 1 && <div className={`w-6 h-px ${done || active ? 'bg-blue-300' : 'bg-slate-200'}`} />}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done   ? 'bg-blue-600 text-white'
                : active ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                : 'bg-slate-200 text-slate-400'
              }`}>
                {done ? (
                  <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
                  </svg>
                ) : n}
              </div>
              <span className={`text-xs font-semibold ${done || active ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          {/* Toggle mensual / anual */}
          <div className="px-5 pt-5">
            <div className="flex bg-slate-100 rounded-xl p-1 relative">
              {/* Pill deslizante */}
              <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-200 ${
                plan === 'anual' ? 'left-[calc(50%+2px)]' : 'left-1'
              }`} />
              {[['mensual','Mensual'], ['anual','Anual']].map(([p, l]) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className="relative flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors z-10"
                >
                  <span className={plan === p ? 'text-slate-800' : 'text-slate-400'}>{l}</span>
                  {p === 'anual' && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                      plan === 'anual'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      −41%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Precio */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 mx-5 mt-4 rounded-2xl px-5 py-5 text-center">
            <div className="flex items-end justify-center gap-1 mb-0.5">
              <span className="text-5xl font-black text-white leading-none">{planActual.precio}</span>
              <span className="text-blue-200 text-sm font-medium mb-1.5">{planActual.cadencia}</span>
            </div>
            <p className="text-blue-200 text-xs">{planActual.detalle}</p>
            {plan === 'anual' && (
              <div className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full mt-2.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
                </svg>
                Ahorra 107 € al año
              </div>
            )}
          </div>

          <div className="px-5 py-5 space-y-4">

            {/* Features */}
            <div className="space-y-2.5">
              {FEATURES.map(({ icon, texto }) => (
                <div key={texto} className="flex items-center gap-3">
                  <span className="text-base shrink-0">{icon}</span>
                  <span className="text-sm text-slate-600">{texto}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="pt-1 space-y-2.5">
              <a
                href={planActual.stripeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-blue-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                {plan === 'anual'
                  ? `Suscribirme — 155 €/año`
                  : `Suscribirme — 22 €/mes`
                }
              </a>

              <button
                onClick={handleVerificar}
                disabled={checking}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {checking ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Verificando…
                  </span>
                ) : 'Ya he pagado — verificar acceso'}
              </button>

              {error && <p className="text-xs text-red-500 text-center leading-relaxed">{error}</p>}
            </div>

            <div className="pt-1 border-t border-slate-100 text-center">
              <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Cerrar sesión
              </button>
            </div>

          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          🔒 Pago seguro con Stripe · Sin permanencia
        </p>
      </div>
    </div>
  )
}
