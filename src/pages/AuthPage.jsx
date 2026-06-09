import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ERRORES = {
  'Invalid login credentials':            'Correo o contraseña incorrectos',
  'User already registered':              'Ya existe una cuenta con ese correo',
  'Password should be at least 6 characters': 'La contraseña debe tener mínimo 6 caracteres',
  'Unable to validate email address':     'El formato del correo no es válido',
  'Email not confirmed':                  'Confirma tu correo antes de iniciar sesión',
}

function traducir(msg) {
  for (const [k, v] of Object.entries(ERRORES)) {
    if (msg.includes(k)) return v
  }
  return msg
}

function InputField({ label, hint, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      <input
        {...props}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition placeholder-slate-400"
      />
    </div>
  )
}

export default function AuthPage({ onSuccess }) {
  const [modo, setModo]           = useState('login')
  const [form, setForm]           = useState({ email: '', password: '', nombre: '', tiendas: [] })
  const [tiendaInput, setTiendaInput] = useState('')
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState('')
  const [infoMsg, setInfoMsg]     = useState('')
  const [verPass, setVerPass]     = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function tiendaFlush(raw = tiendaInput) {
    const nuevas = raw.split(',').map(t => t.trim()).filter(Boolean)
    const unicas = nuevas.filter(t => !form.tiendas.includes(t))
    if (unicas.length) setForm(f => ({ ...f, tiendas: [...f.tiendas, ...unicas] }))
    setTiendaInput('')
  }

  function onTiendaKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); tiendaFlush() }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(), password: form.password,
      })
      if (error) throw error
      const { data: perfil } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      onSuccess(data.session, perfil ?? null)
    } catch (err) {
      setError(traducir(err.message))
    } finally {
      setCargando(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    tiendaFlush()
    const tiendas = [...new Set([...form.tiendas, ...tiendaInput.split(',').map(t => t.trim()).filter(Boolean)])]

    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    if (tiendas.length === 0) return setError('Añade al menos una tienda')
    setError('')
    setCargando(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password })
      if (error) throw error
      if (!data.session) {
        setInfoMsg('¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.')
        return
      }
      const { data: perfil, error: pErr } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, nombre: form.nombre.trim(), correo: data.user.email, tiendas })
        .select().single()
      if (pErr) throw pErr
      onSuccess(data.session, perfil)
    } catch (err) {
      setError(traducir(err.message))
    } finally {
      setCargando(false)
    }
  }

  function cambiarModo(m) { setModo(m); setError(''); setInfoMsg('') }

  // ── Email confirmation ────────────────────────────────────────────────────
  if (infoMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-white border-2 border-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Revisa tu correo</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{infoMsg}</p>
          <button
            onClick={() => cambiarModo('login')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Ir a iniciar sesión →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
            <span className="text-white font-black text-2xl select-none">N</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">NapoGo</h1>
          <p className="text-slate-500 text-sm mt-1">Tu asistente de repartos</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-4">
          {[['login', 'Iniciar sesión'], ['register', 'Crear cuenta']].map(([m, l]) => (
            <button
              key={m}
              onClick={() => cambiarModo(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                modo === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <form onSubmit={modo === 'login' ? handleLogin : handleRegister} className="space-y-4">

            {modo === 'register' && (
              <InputField
                autoFocus
                label="Nombre completo"
                type="text"
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Xavi Napolitano"
              />
            )}

            <InputField
              autoFocus={modo === 'login'}
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="tu@correo.com"
            />

            {/* Password with show/hide */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={verPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setVerPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {verPass ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Tiendas — only on register */}
            {modo === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tus tiendas</label>
                <p className="text-xs text-slate-400 mb-2">
                  Los puntos de entrega donde trabajas. Escribe cada una y pulsa <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">Enter</kbd>
                </p>
                <div className="min-h-[52px] border border-slate-200 rounded-xl p-2.5 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 transition bg-white">
                  {form.tiendas.map(t => (
                    <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-sm font-medium">
                      {t}
                      <button type="button" onClick={() => setForm(f => ({ ...f, tiendas: f.tiendas.filter(x => x !== t) }))}
                        className="text-blue-400 hover:text-red-500 transition-colors leading-none ml-0.5">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tiendaInput}
                    onChange={e => setTiendaInput(e.target.value)}
                    onKeyDown={onTiendaKey}
                    onBlur={() => tiendaFlush()}
                    placeholder={form.tiendas.length === 0 ? 'Corominas, Prats, Zamenhof…' : 'Añadir más…'}
                    className="flex-1 min-w-[140px] outline-none text-sm py-0.5 bg-transparent placeholder-slate-400"
                  />
                </div>
                {form.tiendas.length > 0 && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1.5">
                    ✓ {form.tiendas.length} tienda{form.tiendas.length !== 1 ? 's' : ''} añadida{form.tiendas.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <span className="text-red-500 mt-0.5 shrink-0 text-xs">⚠</span>
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Un momento…
                </span>
              ) : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          🔒 Tus datos están seguros y cifrados en la nube
        </p>
      </div>
    </div>
  )
}
