import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SetupPerfil({ session, onComplete }) {
  const [form, setForm]               = useState({ nombre: '', tiendas: [] })
  const [tiendaInput, setTiendaInput] = useState('')
  const [cargando, setCargando]       = useState(false)
  const [error, setError]             = useState('')

  function tiendaFlush(raw = tiendaInput) {
    const nuevas = raw.split(',').map(t => t.trim()).filter(Boolean)
    const unicas = nuevas.filter(t => !form.tiendas.includes(t))
    if (unicas.length) setForm(f => ({ ...f, tiendas: [...f.tiendas, ...unicas] }))
    setTiendaInput('')
  }

  function onTiendaKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); tiendaFlush() }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    tiendaFlush()
    const tiendas = [...new Set([
      ...form.tiendas,
      ...tiendaInput.split(',').map(t => t.trim()).filter(Boolean),
    ])]
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    if (tiendas.length === 0) return setError('Añade al menos una tienda')
    setError('')
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, nombre: form.nombre.trim(), correo: session.user.email, tiendas })
        .select().single()
      if (error) throw error
      onComplete(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
            <span className="text-white font-black text-2xl select-none">N</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Configura tu perfil</h1>
          <p className="text-slate-500 text-sm mt-1">Un momento antes de empezar</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-xs font-semibold text-blue-600">Cuenta creada</span>
          </div>
          <div className="flex-1 h-px bg-blue-200 max-w-[40px]" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-xs font-semibold text-blue-600">Tu perfil</span>
          </div>
          <div className="flex-1 h-px bg-slate-200 max-w-[40px]" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">3</div>
            <span className="text-xs font-semibold text-slate-400">Activar</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre completo</label>
              <input
                autoFocus
                type="text"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Xavi Napolitano"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tus tiendas</label>
              <p className="text-xs text-slate-400 mb-2">
                Los puntos donde entregas. Escribe cada tienda y pulsa <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono text-xs">Enter</kbd>
              </p>
              <div className="min-h-[52px] border border-slate-200 rounded-xl p-2.5 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 transition bg-white">
                {form.tiendas.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-sm font-medium">
                    {t}
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tiendas: f.tiendas.filter(x => x !== t) }))}
                      className="text-blue-400 hover:text-red-500 transition-colors leading-none ml-0.5"
                    >×</button>
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
                  Guardando…
                </span>
              ) : 'Continuar →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Podrás añadir o cambiar tiendas más adelante desde tu perfil
        </p>
      </div>
    </div>
  )
}
