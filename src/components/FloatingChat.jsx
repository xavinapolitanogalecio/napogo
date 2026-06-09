import { useState, useRef, useEffect, useCallback } from 'react'
import { parsearResumen, extraerFecha } from '../utils/parseResumen'
import { supabase } from '../lib/supabase'

const WEBHOOK_URL = 'https://projecto-xavi-n8n.rwydk6.easypanel.host/webhook/repartos-app'

export default function FloatingChat({ perfil, session, onRepartoGuardado, isOnline = true, onOfflineEnqueue }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      rol: 'bot',
      texto: `¡Hola ${perfil.nombre.split(' ')[0]}! 👋\n\nDime cómo fue el día. Ej:\n"Hoy 15 en ${perfil.tiendas[0] || 'Corominas'} y 9 en ${perfil.tiendas[1] || 'Prats'}"`,
    },
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [preview, setPreview] = useState(null)
  const [grabando, setGrabando] = useState(false)
  const recognitionRef = useRef(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const tieneVoz = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  // Auto-scroll cada vez que llega un nuevo mensaje
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  // Focus en el input al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [abierto])

  // Preview en tiempo real mientras el usuario escribe
  useEffect(() => {
    if (input.trim().length > 4) {
      const { entries } = parsearResumen(input, perfil.tiendas)
      setPreview(entries.length > 0 ? entries : null)
    } else {
      setPreview(null)
    }
  }, [input, perfil.tiendas])

  function iniciarVoz() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    if (grabando) { recognitionRef.current?.stop(); return }
    const r = new SR()
    r.lang = 'es-ES'
    r.onresult = e => setInput(e.results[0][0].transcript)
    r.onerror = () => setGrabando(false)
    r.onend = () => setGrabando(false)
    recognitionRef.current = r
    r.start()
    setGrabando(true)
  }

  const addBotMsg = useCallback((texto) => {
    setMensajes(prev => [...prev, { id: Date.now() + Math.random(), rol: 'bot', texto }])
  }, [])

  async function enviar() {
    const texto = input.trim()
    if (!texto || cargando) return

    setMensajes(prev => [...prev, { id: Date.now(), rol: 'usuario', texto }])
    setInput('')
    setPreview(null)

    // Parse once — defensive: ensure tiendas is always an array
    const tiendas = Array.isArray(perfil?.tiendas) ? perfil.tiendas : []
    const { entries, errores } = parsearResumen(texto, tiendas)

    // ── Modo offline: encolar y salir ────────────────────────────────────
    if (!isOnline) {
      if (entries.length > 0) {
        const filas = entries.map(({ tienda, repartos, fecha }) => ({
          user_id:       session.user.id,
          tienda_nombre: tienda,
          cantidad:      repartos,
          fecha,
        }))
        onOfflineEnqueue?.({ filas, texto })
        let msg = `Sin conexión · ${entries.map(p => `${p.repartos} en ${p.tienda}`).join(', ')} guardado localmente. Se sincronizará al recuperar señal.`
        if (errores.length > 0) msg += `\n⚠️ No pude reconocer: "${errores.join('", "')}". Verifica cómo las tienes escritas en tu perfil.`
        addBotMsg(msg)
      } else {
        addBotMsg('Sin conexión · No se detectaron repartos. Escribe ej: "15 en Corominas".')
      }
      return
    }

    setCargando(true)

    // ── 1. Guardar directamente en Supabase ──────────────────────────────
    let guardadoOk = false
    let upsertError = null

    if (entries.length > 0) {
      const filas = entries.map(({ tienda, repartos, fecha }) => ({
        user_id:       session.user.id,
        tienda_nombre: tienda,   // nombre canónico del perfil, ya corregido por fuzzy
        cantidad:      repartos,
        fecha,
      }))
      try {
        const { error } = await supabase
          .from('repartos')
          .upsert(filas, { onConflict: 'user_id,tienda_nombre,fecha' })
        if (error) {
          upsertError = error.message
          console.error('[Chat] Upsert error:', error)
        } else {
          guardadoOk = true
        }
      } catch (e) {
        upsertError = e?.message ?? 'Error desconocido'
        console.error('[Chat] Upsert exception:', e)
      }
    }

    onRepartoGuardado?.()

    // ── 2. Enviar a n8n para obtener respuesta de texto del AI ───────────
    const payload = {
      message:    texto,
      user_id:    session.user.id,
      user_email: session.user.email,
      timestamp:  new Date().toISOString(),
    }

    const erroresMsg = errores.length > 0
      ? `\n⚠️ No pude reconocer: "${errores.join('", "')}". Verifica cómo las tienes escritas en tu perfil.`
      : ''

    let confirmacionLocal
    if (guardadoOk) {
      confirmacionLocal = `✅ ${entries.map(p => `${p.repartos} en ${p.tienda}`).join(', ')} guardado correctamente.${erroresMsg}`
    } else if (upsertError) {
      confirmacionLocal = `⚠️ Error al guardar en la base de datos: ${upsertError}`
    } else {
      confirmacionLocal = erroresMsg || null
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      let respuesta = confirmacionLocal ?? '✅ Mensaje procesado.'

      if (res.ok) {
        try {
          const data = await res.json()
          if (typeof data === 'string' && data.length > 0)  respuesta = data
          else if (data?.response)  respuesta = data.response
          else if (data?.respuesta) respuesta = data.respuesta
          else if (data?.message)   respuesta = data.message
        } catch {
          try {
            const txt = await res.clone().text()
            if (txt.trim()) respuesta = txt.trim()
          } catch { /* ignorar */ }
        }
      } else {
        respuesta = confirmacionLocal ?? `⚠️ El servidor respondió con error ${res.status}.`
      }

      addBotMsg(respuesta)
      onRepartoGuardado?.()
    } catch {
      addBotMsg(confirmacionLocal ?? '❌ No se pudo conectar con el servidor. Comprueba tu conexión.')
      onRepartoGuardado?.()
    } finally {
      setCargando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  return (
    <>
      {/* ── Panel del chat ── */}
      {abierto && (
        <div className="fixed bottom-[76px] right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[22rem] max-h-[68vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200 dark:border-gray-700">

          {/* Cabecera */}
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-base">🗓</div>
              <div>
                <p className="text-white font-bold text-sm">Resumen del día</p>
                <p className="text-blue-200 text-xs">Sincronizado en la nube</p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="text-blue-300 hover:text-white p-1 transition-colors rounded-lg"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-gray-900 scrollbar-thin">
            {mensajes.map(m => (
              <div key={m.id} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  m.rol === 'usuario'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 shadow-sm border border-slate-100 dark:border-gray-600 rounded-bl-sm'
                }`}>
                  {m.texto}
                </div>
              </div>
            ))}

            {/* Indicador "Escribiendo..." */}
            {cargando && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 border border-slate-100 dark:border-gray-600 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-slate-400 text-xs ml-1">Escribiendo...</span>
                </div>
              </div>
            )}

            {/* Ancla de scroll — siempre al final */}
            <div ref={endRef} />
          </div>

          {/* Preview de datos detectados */}
          {preview && preview.length > 0 && !cargando && (
            <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-100 shrink-0">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">
                Detectado (vista previa)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((p, i) => (
                  <span key={i} className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold">
                    {p.repartos} × {p.tienda}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 shrink-0">
            <div className="flex gap-2 items-end">
              {tieneVoz && (
                <button
                  onClick={iniciarVoz}
                  title={grabando ? 'Detener grabación' : 'Dictar por voz'}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    grabando
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-600'
                  }`}
                >
                  🎤
                </button>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ej: 15 en ${perfil.tiendas[0] || 'Corominas'} y 9 en ${perfil.tiendas[1] || 'Prats'}...`}
                rows={1}
                disabled={cargando}
                className="flex-1 resize-none bg-slate-100 dark:bg-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-28 scrollbar-thin"
              />
              <button
                onClick={enviar}
                disabled={!input.trim() || cargando}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB — solo visible cuando el chat está cerrado ── */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-[76px] right-4 sm:right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 hover:shadow-xl text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50 active:scale-95"
          aria-label="Abrir chat de repartos"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </>
  )
}
