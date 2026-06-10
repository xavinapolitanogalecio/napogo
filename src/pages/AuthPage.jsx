import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ERRORES = {
  'Invalid login credentials':                'Correo o contraseña incorrectos',
  'User already registered':                  'Ya existe una cuenta con ese correo',
  'Password should be at least 6 characters': 'La contraseña debe tener mínimo 6 caracteres',
  'Unable to validate email address':         'El formato del correo no es válido',
  'Email not confirmed':                      'Confirma tu correo antes de iniciar sesión',
}
function traducir(msg = '') {
  for (const [k, v] of Object.entries(ERRORES)) if (msg.includes(k)) return v
  return msg
}

// ── Iconos ─────────────────────────────────────────────────────────────────────
function IconArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}
function IconEye({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

// ── Logo NapoGo ────────────────────────────────────────────────────────────────
function Logo({ size = 'md' }) {
  const sz = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14'
  return (
    <img src="/NapoGologo.png" alt="NapoGo" className={`${sz} object-contain mx-auto`} />
  )
}

// ── Botón primario ─────────────────────────────────────────────────────────────
function BtnPrimary({ children, onClick, disabled, type = 'button', cargando }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || cargando}
      className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-2xl text-base font-bold transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
    >
      {cargando
        ? <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg><span>Un momento…</span></>
        : children
      }
    </button>
  )
}

// ── Input genérico ─────────────────────────────────────────────────────────────
function Input({ label, autoFocus, ...props }) {
  const ref = useRef(null)
  useEffect(() => { if (autoFocus) setTimeout(() => ref.current?.focus(), 80) }, [autoFocus])
  return (
    <div>
      {label && <label className="block text-sm font-semibold text-slate-600 mb-2">{label}</label>}
      <input
        ref={ref}
        {...props}
        className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-base focus:outline-none bg-white transition placeholder-slate-300"
      />
    </div>
  )
}

// ── Error box ──────────────────────────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 text-sm text-red-600 font-medium">
      <span className="shrink-0 mt-0.5">⚠</span>{msg}
    </div>
  )
}

// ── Puntos de progreso ─────────────────────────────────────────────────────────
function Dots({ total, actual }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === actual ? 'w-6 bg-blue-600' : i < actual ? 'w-1.5 bg-blue-300' : 'w-1.5 bg-slate-200'}`} />
      ))}
    </div>
  )
}

// ── Wrapper de paso ────────────────────────────────────────────────────────────
function Paso({ children, onVolver, totalPasos, pasoActual }) {
  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-safe">
      <div className="flex items-center justify-between py-5">
        <button onClick={onVolver} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
          <IconArrowLeft />
        </button>
        {totalPasos && <Dots total={totalPasos} actual={pasoActual} />}
        <div className="w-10" />
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-8 gap-6">
        {children}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PANTALLAS
// ══════════════════════════════════════════════════════════════════════════════

// ── Bienvenida ─────────────────────────────────────────────────────────────────
function PantallaBienvenida({ onCrear, onLogin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex flex-col items-center justify-center px-6 pb-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <Logo size="lg" />
          <h1 className="text-3xl font-black text-slate-800 mt-5 mb-2">NapoGo</h1>
          <p className="text-slate-500 text-base leading-relaxed">
            Lleva el control de tus repartos<br/>de forma rápida y sencilla
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <BtnPrimary onClick={onCrear}>Crear cuenta gratis</BtnPrimary>
          <button
            onClick={onLogin}
            className="w-full py-4 border-2 border-slate-200 hover:border-slate-300 text-slate-700 rounded-2xl text-base font-bold transition-all hover:bg-slate-50"
          >
            Ya tengo cuenta
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          🔒 Tus datos están seguros y cifrados en la nube
        </p>
      </div>
    </div>
  )
}

// ── Login ──────────────────────────────────────────────────────────────────────
function PantallaLogin({ onVolver, onSuccess }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass]   = useState(false)
  const [error, setError]       = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      const { data: perfil } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      onSuccess(data.session, perfil ?? null)
    } catch (err) {
      setError(traducir(err.message))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Paso onVolver={onVolver}>
      <div>
        <Logo />
        <h2 className="text-2xl font-black text-slate-800 mt-5 mb-1">Bienvenido de nuevo</h2>
        <p className="text-slate-500 text-sm">Inicia sesión en tu cuenta</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input autoFocus label="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">Contraseña</label>
          <div className="relative">
            <input
              type={verPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-2xl px-4 py-3.5 pr-12 text-base focus:outline-none bg-white transition placeholder-slate-300"
            />
            <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <IconEye open={verPass} />
            </button>
          </div>
        </div>

        <ErrorBox msg={error} />

        <BtnPrimary type="submit" cargando={cargando} disabled={!email || !password}>
          Iniciar sesión
        </BtnPrimary>
      </form>
    </Paso>
  )
}

// ── Registro: paso 1 — Nombre ──────────────────────────────────────────────────
function RegNombre({ datos, onSiguiente, onVolver }) {
  const [nombre, setNombre] = useState(datos.nombre)

  function siguiente(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    onSiguiente({ nombre: nombre.trim() })
  }

  return (
    <Paso onVolver={onVolver} totalPasos={3} pasoActual={0}>
      <div>
        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Paso 1 de 3</p>
        <h2 className="text-2xl font-black text-slate-800 mb-1">¿Cómo te llamas?</h2>
        <p className="text-slate-500 text-sm">Con esto personalizamos tu experiencia</p>
      </div>

      <form onSubmit={siguiente} className="flex flex-col gap-4">
        <Input autoFocus type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre completo" />
        <BtnPrimary type="submit" disabled={!nombre.trim()}>Continuar →</BtnPrimary>
      </form>
    </Paso>
  )
}

// ── Registro: paso 2 — Email + contraseña ─────────────────────────────────────
function RegCredenciales({ datos, onSiguiente, onVolver }) {
  const [email, setEmail]       = useState(datos.email)
  const [password, setPassword] = useState(datos.password)
  const [verPass, setVerPass]   = useState(false)
  const [error, setError]       = useState('')

  function siguiente(e) {
    e.preventDefault()
    if (!email.trim() || password.length < 6) {
      setError(password.length < 6 ? 'La contraseña debe tener mínimo 6 caracteres' : '')
      return
    }
    setError('')
    onSiguiente({ email: email.trim(), password })
  }

  return (
    <Paso onVolver={onVolver} totalPasos={3} pasoActual={1}>
      <div>
        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Paso 2 de 3</p>
        <h2 className="text-2xl font-black text-slate-800 mb-1">Tu acceso</h2>
        <p className="text-slate-500 text-sm">Con esto entrarás a la app cada vez</p>
      </div>

      <form onSubmit={siguiente} className="flex flex-col gap-4">
        <Input autoFocus label="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">Contraseña</label>
          <div className="relative">
            <input
              type={verPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-2xl px-4 py-3.5 pr-12 text-base focus:outline-none bg-white transition placeholder-slate-300"
            />
            <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <IconEye open={verPass} />
            </button>
          </div>
        </div>

        <ErrorBox msg={error} />
        <BtnPrimary type="submit" disabled={!email || password.length < 6}>Continuar →</BtnPrimary>
      </form>
    </Paso>
  )
}

// ── Registro: paso 3 — Tiendas ─────────────────────────────────────────────────
function RegTiendas({ datos, onFinalizar, onVolver, cargando, error }) {
  const [tiendas, setTiendas] = useState(datos.tiendas)
  const [input, setInput]     = useState('')

  function flush(raw = input) {
    const nuevas = raw.split(',').map(t => t.trim()).filter(Boolean)
    const unicas = nuevas.filter(t => !tiendas.includes(t))
    if (unicas.length) setTiendas(t => [...t, ...unicas])
    setInput('')
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); flush() }
  }

  function quitar(t) { setTiendas(ts => ts.filter(x => x !== t)) }

  function finalizar(e) {
    e.preventDefault()
    flush()
    const all = [...new Set([...tiendas, ...input.split(',').map(t => t.trim()).filter(Boolean)])]
    if (all.length === 0) return
    onFinalizar({ tiendas: all })
  }

  return (
    <Paso onVolver={onVolver} totalPasos={3} pasoActual={2}>
      <div>
        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Paso 3 de 3</p>
        <h2 className="text-2xl font-black text-slate-800 mb-1">¿Dónde repartes?</h2>
        <p className="text-slate-500 text-sm">
          Escribe cada tienda y pulsa{' '}
          <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono text-xs">Enter</kbd>
        </p>
      </div>

      <form onSubmit={finalizar} className="flex flex-col gap-4">
        <div className="border-2 border-slate-200 focus-within:border-blue-500 rounded-2xl p-3 min-h-[80px] flex flex-wrap gap-2 transition bg-white">
          {tiendas.map(t => (
            <span key={t} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-semibold">
              {t}
              <button type="button" onClick={() => quitar(t)} className="text-blue-400 hover:text-red-500 transition-colors leading-none">×</button>
            </span>
          ))}
          <input
            autoFocus
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => flush()}
            placeholder={tiendas.length === 0 ? 'Corominas, Prats, Zamenhof…' : 'Añadir más…'}
            className="flex-1 min-w-[140px] outline-none text-base bg-transparent placeholder-slate-300 py-1"
          />
        </div>

        {tiendas.length > 0 && (
          <p className="text-sm text-emerald-600 font-semibold -mt-2">
            ✓ {tiendas.length} tienda{tiendas.length !== 1 ? 's' : ''} añadida{tiendas.length !== 1 ? 's' : ''}
          </p>
        )}

        <ErrorBox msg={error} />

        <BtnPrimary type="submit" cargando={cargando} disabled={tiendas.length === 0 && !input.trim()}>
          Crear mi cuenta
        </BtnPrimary>
      </form>

      <p className="text-xs text-slate-400 text-center -mt-2">
        Puedes añadir o cambiar tiendas más adelante
      </p>
    </Paso>
  )
}

// ── Éxito ──────────────────────────────────────────────────────────────────────
function PantallaExito({ nombre, confirmarEmail, onContinuar }) {
  if (confirmarEmail) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
          <div className="w-24 h-24 bg-blue-50 border-2 border-blue-100 rounded-3xl flex items-center justify-center text-5xl">
            📧
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Revisa tu correo</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Te hemos enviado un enlace de confirmación a<br/>
              tu correo. Confírmalo y luego inicia sesión.
            </p>
          </div>
          <div className="w-full flex flex-col gap-3">
            <BtnPrimary onClick={onContinuar}>Ir a iniciar sesión →</BtnPrimary>
            <p className="text-xs text-slate-400">¿No te ha llegado? Revisa la carpeta de spam</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

        <div className="relative">
          <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-14 h-14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-400 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white">
            <span className="text-white text-lg">🎉</span>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">¡Todo listo!</h2>
          <p className="text-slate-500 text-base leading-relaxed">
            Hola <span className="font-bold text-slate-700">{nombre.split(' ')[0]}</span>, tu cuenta está creada.<br/>
            Solo falta activar el plan.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <BtnPrimary onClick={onContinuar}>Ver planes →</BtnPrimary>
          <p className="text-xs text-slate-400">🔒 Pago seguro con Stripe · Sin permanencia · Cancela cuando quieras</p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE RAÍZ
// ══════════════════════════════════════════════════════════════════════════════
export default function AuthPage({ onSuccess }) {
  // pantalla: bienvenida | login | reg1 | reg2 | reg3 | exito
  const [pantalla, setPantalla] = useState('bienvenida')
  const [datos, setDatos]       = useState({ nombre: '', email: '', password: '', tiendas: [] })
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState('')
  const [exitoData, setExitoData] = useState(null)

  function avanzarReg(nuevos) {
    const d = { ...datos, ...nuevos }
    setDatos(d)
    setPantalla(p => p === 'reg1' ? 'reg2' : p === 'reg2' ? 'reg3' : p)
  }

  async function finalizar({ tiendas }) {
    const d = { ...datos, tiendas }
    setDatos(d)
    setError('')
    setCargando(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: d.email, password: d.password, nombre: d.nombre, tiendas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al crear la cuenta')

      setExitoData({ nombre: d.nombre, session: null, perfil: null, confirmarEmail: true })
      setPantalla('exito')
    } catch (err) {
      setError(traducir(err.message))
    } finally {
      setCargando(false)
    }
  }

  if (pantalla === 'bienvenida') return (
    <PantallaBienvenida
      onCrear={() => setPantalla('reg1')}
      onLogin={() => setPantalla('login')}
    />
  )

  if (pantalla === 'login') return (
    <PantallaLogin
      onVolver={() => setPantalla('bienvenida')}
      onSuccess={onSuccess}
    />
  )

  if (pantalla === 'reg1') return (
    <RegNombre
      datos={datos}
      onSiguiente={avanzarReg}
      onVolver={() => setPantalla('bienvenida')}
    />
  )

  if (pantalla === 'reg2') return (
    <RegCredenciales
      datos={datos}
      onSiguiente={avanzarReg}
      onVolver={() => setPantalla('reg1')}
    />
  )

  if (pantalla === 'reg3') return (
    <RegTiendas
      datos={datos}
      onFinalizar={finalizar}
      onVolver={() => setPantalla('reg2')}
      cargando={cargando}
      error={error}
    />
  )

  if (pantalla === 'exito' && exitoData) return (
    <PantallaExito
      nombre={exitoData.nombre}
      confirmarEmail={exitoData.confirmarEmail}
      onContinuar={() => {
        if (exitoData.session) {
          onSuccess(exitoData.session, exitoData.perfil)
        } else {
          setPantalla('login')
        }
      }}
    />
  )

  return null
}
