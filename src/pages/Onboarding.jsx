import { useState } from 'react'

const PASOS = ['Tu perfil', 'Tus tiendas']

export default function Onboarding({ onComplete }) {
  const [paso, setPaso] = useState(0)
  const [datos, setDatos] = useState({ nombre: '', correo: '', tiendas: [] })
  const [tiendaInput, setTiendaInput] = useState('')
  const [error, setError] = useState('')

  function siguiente() {
    if (paso === 0) {
      if (!datos.nombre.trim()) return setError('El nombre es obligatorio')
      if (!datos.correo.includes('@')) return setError('Introduce un correo válido')
      setError('')
      setPaso(1)
    } else {
      flushTiendaInput()
      if (datos.tiendas.length === 0) return setError('Añade al menos una tienda')
      setError('')
      onComplete(datos)
    }
  }

  function flushTiendaInput(inputVal = tiendaInput) {
    if (!inputVal.trim()) return
    const nuevas = inputVal.split(',').map(t => t.trim()).filter(Boolean)
    const unicas = nuevas.filter(t => !datos.tiendas.includes(t))
    if (unicas.length) setDatos(d => ({ ...d, tiendas: [...d.tiendas, ...unicas] }))
    setTiendaInput('')
  }

  function onTiendaKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      flushTiendaInput()
    }
  }

  function quitarTienda(t) {
    setDatos(d => ({ ...d, tiendas: d.tiendas.filter(x => x !== t) }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
            <span className="text-white font-black text-2xl tracking-tight select-none">N</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">NapoGo</h1>
          <p className="text-slate-500 text-sm mt-1">Tu asistente de repartos</p>
        </div>

        {/* Progress steps */}
        <div className="flex gap-3 mb-6">
          {PASOS.map((s, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${i <= paso ? 'bg-blue-600' : 'bg-slate-200'}`} />
              <p className={`text-xs mt-1.5 font-medium transition-colors ${i === paso ? 'text-blue-600' : 'text-slate-400'}`}>
                {s}
              </p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {paso === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre completo</label>
                <input
                  autoFocus
                  type="text"
                  value={datos.nombre}
                  onChange={e => setDatos(d => ({ ...d, nombre: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && siguiente()}
                  placeholder="Ej: Xavi Napolitano"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={datos.correo}
                  onChange={e => setDatos(d => ({ ...d, correo: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && siguiente()}
                  placeholder="tu@correo.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}

          {paso === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tus tiendas</label>
                <p className="text-xs text-slate-400 mb-2.5">
                  Escribe el nombre y pulsa <kbd className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">Enter</kbd> o coma para añadir
                </p>
                <div className="min-h-[52px] border border-slate-200 rounded-xl p-2.5 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                  {datos.tiendas.map(t => (
                    <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium">
                      {t}
                      <button onClick={() => quitarTienda(t)} className="text-blue-400 hover:text-blue-700 leading-none ml-0.5">×</button>
                    </span>
                  ))}
                  <input
                    autoFocus
                    type="text"
                    value={tiendaInput}
                    onChange={e => setTiendaInput(e.target.value)}
                    onKeyDown={onTiendaKeyDown}
                    onBlur={() => flushTiendaInput()}
                    placeholder={datos.tiendas.length === 0 ? 'Corominas, Prats, Lidl...' : 'Añadir más...'}
                    className="flex-1 min-w-[130px] outline-none text-sm py-1 bg-transparent"
                  />
                </div>
              </div>
              {datos.tiendas.length > 0 && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ {datos.tiendas.length} tienda{datos.tiendas.length !== 1 ? 's' : ''} lista{datos.tiendas.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-500 font-medium">{error}</p>}

          <div className={`mt-6 flex gap-3 ${paso > 0 ? '' : ''}`}>
            {paso > 0 && (
              <button
                onClick={() => { setError(''); setPaso(p => p - 1) }}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Atrás
              </button>
            )}
            <button
              onClick={siguiente}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              {paso === PASOS.length - 1 ? '¡Empezar!' : 'Continuar →'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Tus datos se guardan localmente en este dispositivo
        </p>
      </div>
    </div>
  )
}
