import { useState, useEffect } from 'react'

function IconSol() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-400">
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  )
}

function IconLuna() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-500">
      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
    </svg>
  )
}

export default function PerfilPage({ usuario, onActualizar, onLogout, darkMode, onToggleDark }) {
  const [editandoInfo, setEditandoInfo]     = useState(false)
  const [form, setForm]                     = useState({ nombre: usuario.nombre, correo: usuario.correo })
  const [tiendas, setTiendas]               = useState([...usuario.tiendas])
  const [nuevaTienda, setNuevaTienda]       = useState('')
  const [guardado, setGuardado]             = useState(false)
  const [guardandoInfo, setGuardandoInfo]   = useState(false)
  const [confirmLogout, setConfirmLogout]   = useState(false)

  // Tarifas: { tienda_nombre: precio_float }
  const [tarifas, setTarifas]               = useState(() => usuario.tarifas ?? {})
  const [guardandoTarifas, setGuardandoTarifas] = useState(false)
  const [guardadoTarifas, setGuardadoTarifas]   = useState(false)
  const [errorTarifas, setErrorTarifas]         = useState(null)

  // Sincroniza el estado local cuando el perfil cambia en el padre (p.ej. tras guardar)
  useEffect(() => {
    setTarifas(usuario.tarifas ?? {})
  }, [usuario.tarifas])

  async function guardarInfo() {
    if (!form.nombre.trim()) return
    setGuardandoInfo(true)
    await onActualizar({ nombre: form.nombre.trim(), correo: form.correo.trim() })
    setGuardandoInfo(false)
    setEditandoInfo(false)
  }

  async function guardarTiendas() {
    if (tiendas.length === 0) return
    await onActualizar({ tiendas })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  async function guardarTarifas() {
    setGuardandoTarifas(true)
    setErrorTarifas(null)
    const clean = {}
    tiendas.forEach(t => {
      const v = tarifas[t]
      if (v !== undefined && v !== '' && !isNaN(Number(v))) clean[t] = Number(v)
    })
    const { error } = await onActualizar({ tarifas: clean })
    setGuardandoTarifas(false)
    if (error) {
      setErrorTarifas(`No se pudieron guardar las tarifas: ${error.message}`)
      return
    }
    setGuardadoTarifas(true)
    setTimeout(() => setGuardadoTarifas(false), 2000)
  }

  function añadirTienda() {
    const t = nuevaTienda.trim()
    if (t && !tiendas.includes(t)) setTiendas(prev => [...prev, t])
    setNuevaTienda('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); añadirTienda() }
  }

  const miembro = new Date(usuario.created_at).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const diasMiembro = usuario.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(usuario.created_at)) / 86400000))
    : '—'
  const tarifasConf = Object.values(tarifas).filter(v => v !== undefined && v !== '').length

  const card = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 p-5 transition-colors'
  const label = 'font-bold text-slate-700 dark:text-gray-200'
  const sublabel = 'text-xs text-slate-400 dark:text-gray-500'
  const inputCls = 'w-full border border-slate-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* ── NapoGo Profile Hero ── */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-5 overflow-hidden">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-6 bottom-[-20px] w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center text-white font-black text-xl select-none shrink-0">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-blue-200 text-xs font-medium">NapoGo · Tu cuenta</p>
            <p className="font-black text-white text-lg leading-tight truncate">{usuario.nombre}</p>
            <p className="text-blue-200 text-xs truncate">{usuario.correo}</p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 text-center pt-3 border-t border-white/15">
          <div>
            <p className="text-xl font-black text-white">{tiendas.length}</p>
            <p className="text-blue-200 text-[9px] font-bold uppercase tracking-wide mt-0.5">Tiendas</p>
          </div>
          <div className="border-x border-white/15">
            <p className="text-xl font-black text-white">{tarifasConf}</p>
            <p className="text-blue-200 text-[9px] font-bold uppercase tracking-wide mt-0.5">Tarifas</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">{diasMiembro}</p>
            <p className="text-blue-200 text-[9px] font-bold uppercase tracking-wide mt-0.5">Días</p>
          </div>
        </div>
      </div>

      {/* ── Info personal ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={label}>Información personal</h2>
            <p className={`mt-0.5 ${sublabel}`}>Cuenta desde {miembro}</p>
          </div>
          <button
            onClick={() => {
              setForm({ nombre: usuario.nombre, correo: usuario.correo })
              setEditandoInfo(!editandoInfo)
            }}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            {editandoInfo ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {editandoInfo && (
          <div className="border-t border-slate-100 dark:border-gray-700 pt-4 space-y-3">
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre completo"
              className={inputCls}
            />
            <input
              type="email"
              value={form.correo}
              onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
              placeholder="Correo electrónico"
              className={inputCls}
            />
            <button
              onClick={guardarInfo}
              disabled={guardandoInfo}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {guardandoInfo ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {/* ── Mis tiendas ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={label}>Mis tiendas</h2>
          <span className={sublabel}>{tiendas.length} tienda{tiendas.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
          {tiendas.map(t => (
            <span key={t} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl text-sm font-semibold">
              {t}
              <button
                onClick={() => setTiendas(prev => prev.filter(x => x !== t))}
                className="text-blue-400 hover:text-red-500 dark:hover:text-red-400 transition-colors leading-none"
              >
                ×
              </button>
            </span>
          ))}
          {tiendas.length === 0 && <p className={`text-sm italic ${sublabel}`}>Sin tiendas</p>}
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={nuevaTienda}
            onChange={e => setNuevaTienda(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nueva tienda..."
            className="flex-1 border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            onClick={añadirTienda}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
          >
            +
          </button>
        </div>

        <button
          onClick={guardarTiendas}
          disabled={tiendas.length === 0}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            guardado
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {guardado ? '✓ Tiendas guardadas' : 'Guardar tiendas'}
        </button>
      </div>

      {/* ── Tarifas por tienda ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-1">
          <h2 className={label}>Tarifas por tienda</h2>
          <span className={sublabel}>€ / reparto</span>
        </div>
        <p className={`text-xs mb-4 ${sublabel}`}>
          Sin tarifa asignada se usa 1,00 € por defecto en el cálculo de ganancias.
        </p>

        {tiendas.length === 0 ? (
          <p className={`text-sm italic ${sublabel}`}>Añade tiendas primero</p>
        ) : (
          <div className="space-y-2.5 mb-4">
            {tiendas.map(t => (
              <div key={t} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{t}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-sm font-bold ${sublabel}`}>€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tarifas[t] ?? ''}
                    onChange={e => setTarifas(prev => ({
                      ...prev,
                      [t]: e.target.value === '' ? undefined : e.target.value,
                    }))}
                    placeholder="1.00"
                    className="w-24 border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-right bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {errorTarifas && (
          <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            ⚠️ {errorTarifas}
          </div>
        )}

        {tiendas.length > 0 && (
          <button
            onClick={guardarTarifas}
            disabled={guardandoTarifas}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
              guardadoTarifas
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60'
            }`}
          >
            {guardadoTarifas ? '✓ Tarifas guardadas' : guardandoTarifas ? 'Guardando...' : 'Guardar tarifas'}
          </button>
        )}
      </div>

      {/* ── NapoGo Status ── */}
      <div className="bg-slate-900 dark:bg-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <img src="/NapoGologo.png" alt="NapoGo" className="w-10 h-10 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">NapoGo</p>
            <p className="text-slate-400 text-xs">Sincronización en tiempo real activa</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs font-bold">Online</span>
          </div>
        </div>
      </div>

      {/* ── Apariencia (dark mode) ── */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={label}>Apariencia</h2>
            <p className={`mt-0.5 ${sublabel}`}>{darkMode ? 'Modo oscuro activo' : 'Modo claro activo'}</p>
          </div>
          <button
            onClick={onToggleDark}
            aria-label="Cambiar modo de color"
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode ? 'bg-blue-600' : 'bg-slate-200 dark:bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 flex items-center justify-center ${
              darkMode ? 'translate-x-7' : 'translate-x-0'
            }`}>
              {darkMode ? <IconSol /> : <IconLuna />}
            </span>
          </button>
        </div>
      </div>

      {/* ── Sesión ── */}
      <div className={card}>
        <h2 className={`${label} mb-1`}>Sesión</h2>
        <p className={`${sublabel} mb-3`}>
          Al cerrar sesión, tus datos quedan guardados en la nube y los recuperarás al volver a entrar.
        </p>
        {confirmLogout ? (
          <div className="flex gap-2">
            <button
              onClick={onLogout}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Confirmar salida
            </button>
            <button
              onClick={() => setConfirmLogout(false)}
              className="flex-1 py-2.5 border border-slate-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full py-2.5 border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cerrar sesión
          </button>
        )}
      </div>

      <div className="h-4" />
    </div>
  )
}
