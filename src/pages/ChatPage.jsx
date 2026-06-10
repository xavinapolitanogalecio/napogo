import { useState, useRef, useEffect, useCallback } from 'react'
import { parsearResumen } from '../utils/parseResumen'
import { supabase } from '../lib/supabase'

const WEBHOOK_URL = 'https://projecto-xavi-n8n.rwydk6.easypanel.host/webhook/repartos-app'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function DeliveryIcon({ estado }) {
  if (estado === 'sending') {
    return (
      <svg className="w-3 h-3 animate-spin text-blue-300" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    )
  }
  if (estado === 'sent') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    )
  }
  if (estado === 'error') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-red-400">
        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
      </svg>
    )
  }
  return null
}

function BotAvatar() {
  return (
    <img src="/NapoGologo.png" alt="NapoGo" className="w-7 h-7 object-contain shrink-0 mt-0.5" />
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start gap-2.5">
      <BotAvatar />
      <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function MessageBubble({ m }) {
  const isUser = m.rol === 'usuario'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2.5`}>
      {!isUser && <BotAvatar />}
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-200 dark:shadow-none'
            : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200 shadow-sm border border-slate-100 dark:border-gray-700 rounded-bl-sm'
        }`}>
          {m.texto}
        </div>
        <div className="flex items-center gap-1 mt-1 px-0.5">
          <span className="text-[10px] text-slate-400 dark:text-gray-500">{formatTime(m.ts)}</span>
          {isUser && <DeliveryIcon estado={m.estado} />}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage({ perfil, session, onRepartoGuardado, isOnline = true, onOfflineEnqueue }) {
  const primerNombre = (perfil.nombre ?? '').split(' ')[0]

  const [mensajes, setMensajes] = useState(() => [
    {
      id: 1,
      rol: 'bot',
      texto: `¡Hola ${primerNombre}! 👋\n\nDime cómo fue el día. Por ejemplo:\n"Hoy 15 en ${perfil.tiendas?.[0] || 'Corominas'} y 9 en ${perfil.tiendas?.[1] || 'Prats'}"`,
      ts: Date.now(),
      estado: null,
    },
  ])
  const [input, setInput]     = useState('')
  const [cargando, setCargando] = useState(false)
  const [preview, setPreview]   = useState(null)
  const [grabando, setGrabando] = useState(false)

  const recognitionRef = useRef(null)
  const endRef         = useRef(null)
  const inputRef       = useRef(null)
  const tieneVoz = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

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
    r.onend   = () => setGrabando(false)
    recognitionRef.current = r
    r.start()
    setGrabando(true)
  }

  const addBotMsg = useCallback((texto) => {
    setMensajes(prev => [...prev, {
      id: Date.now() + Math.random(), rol: 'bot', texto, ts: Date.now(), estado: null,
    }])
  }, [])

  async function enviar() {
    const texto = input.trim()
    if (!texto || cargando) return

    const msgId  = Date.now()
    const tiendas = Array.isArray(perfil?.tiendas) ? perfil.tiendas : []

    setMensajes(prev => [...prev, { id: msgId, rol: 'usuario', texto, ts: msgId, estado: 'sending' }])
    setInput('')
    setPreview(null)

    // ── Modo offline ────────────────────────────────────────────────────
    if (!isOnline) {
      const { entries, errores } = parsearResumen(texto, tiendas)
      if (entries.length > 0) {
        const filas = entries.map(({ tienda, repartos, fecha }) => ({
          user_id: session.user.id, tienda_nombre: tienda, cantidad: repartos, fecha,
        }))
        onOfflineEnqueue?.({ filas, texto })
        let msg = `Sin conexión · ${entries.map(p => `${p.repartos} en ${p.tienda}`).join(', ')} guardado localmente. Se sincronizará al recuperar señal.`
        if (errores.length > 0) msg += `\n⚠️ No reconocí: "${errores.join('", "')}". Verifica tus tiendas en el perfil.`
        setMensajes(prev => prev.map(m => m.id === msgId ? { ...m, estado: 'sent' } : m))
        addBotMsg(msg)
      } else {
        setMensajes(prev => prev.map(m => m.id === msgId ? { ...m, estado: 'error' } : m))
        addBotMsg('Sin conexión · No detecté repartos. Escribe por ejemplo: "15 en Corominas".')
      }
      return
    }

    setCargando(true)
    const { entries, errores } = parsearResumen(texto, tiendas)

    // ── 1. Guardar en Supabase ──────────────────────────────────────────
    let guardadoOk  = false
    let upsertError = null

    if (entries.length > 0) {
      const filas = entries.map(({ tienda, repartos, fecha }) => ({
        user_id: session.user.id, tienda_nombre: tienda, cantidad: repartos, fecha,
      }))
      try {
        // Manual upsert: select → update si existe, insert si no
        // Evita depender del constraint unique que puede no estar en la BD
        for (const fila of filas) {
          const { data: existing, error: selErr } = await supabase
            .from('repartos').select('id')
            .eq('user_id', fila.user_id)
            .eq('tienda_nombre', fila.tienda_nombre)
            .eq('fecha', fila.fecha)
            .maybeSingle()
          if (selErr) throw selErr
          if (existing) {
            const { error: updErr } = await supabase
              .from('repartos').update({ cantidad: fila.cantidad }).eq('id', existing.id)
            if (updErr) throw updErr
          } else {
            const { error: insErr } = await supabase.from('repartos').insert(fila)
            if (insErr) throw insErr
          }
        }
        guardadoOk = true
      } catch (e) {
        upsertError = e?.message ?? 'Error desconocido'
      }
    }

    setMensajes(prev => prev.map(m => m.id === msgId
      ? { ...m, estado: (guardadoOk || entries.length === 0) ? 'sent' : 'error' }
      : m
    ))
    onRepartoGuardado?.()

    // ── 2. Enviar a n8n para respuesta IA ──────────────────────────────
    const payload = {
      message: texto, user_id: session.user.id,
      user_email: session.user.email, timestamp: new Date().toISOString(),
    }

    const erroresMsg = errores.length > 0
      ? `\n⚠️ No reconocí: "${errores.join('", "')}". Verifica cómo las tienes en tu perfil.`
      : ''

    let confirmacionLocal
    if (guardadoOk) {
      confirmacionLocal = `✅ ${entries.map(p => `${p.repartos} en ${p.tienda}`).join(', ')} guardado.${erroresMsg}`
    } else if (upsertError) {
      confirmacionLocal = `⚠️ Error al guardar: ${upsertError}`
    } else {
      confirmacionLocal = erroresMsg || null
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let respuesta = confirmacionLocal ?? '✅ Procesado.'
      if (res.ok) {
        const clonedRes = res.clone()
        try {
          const data = await res.json()
          if (typeof data === 'string' && data.length > 0) respuesta = data
          else if (data?.response)  respuesta = data.response
          else if (data?.respuesta) respuesta = data.respuesta
          else if (data?.message)   respuesta = data.message
        } catch {
          try {
            const txt = await clonedRes.text()
            if (txt.trim()) respuesta = txt.trim()
          } catch {}
        }
      } else {
        respuesta = confirmacionLocal ?? `⚠️ Error del servidor (${res.status}).`
      }
      addBotMsg(respuesta)
      onRepartoGuardado?.()
    } catch {
      addBotMsg(confirmacionLocal ?? '❌ Sin conexión con el servidor. Comprueba tu red.')
      onRepartoGuardado?.()
    } finally {
      setCargando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  return (
    <div className={`fixed inset-x-0 ${isOnline ? 'top-0' : 'top-7'} bottom-16 flex flex-col bg-slate-50 dark:bg-gray-950 z-10 overflow-hidden`}>

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <img src="/NapoGologo.png" alt="NapoGo" className="w-9 h-9 object-contain shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">NapoGo Assistant</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate">
              {isOnline ? 'En línea · Sincronizado con la nube' : 'Sin conexión · Modo offline'}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-300 dark:text-gray-600 uppercase tracking-widest select-none">
          {mensajes.length - 1} msg
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {mensajes.map(m => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {cargando && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {/* ── Preview bar ── */}
      {preview && preview.length > 0 && !cargando && (
        <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800/40 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
              ✓ Detectado
            </span>
            {preview.map((p, i) => (
              <span
                key={i}
                className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold"
              >
                {p.repartos} × {p.tienda}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 shrink-0">
        <div className="flex gap-2 items-end max-w-2xl mx-auto">
          {tieneVoz && (
            <button
              onClick={iniciarVoz}
              title={grabando ? 'Detener grabación' : 'Dictar por voz'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                grabando
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200 dark:shadow-none'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ej: 15 en ${perfil.tiendas?.[0] || 'Corominas'} y 9 en ${perfil.tiendas?.[1] || 'Prats'}…`}
            rows={1}
            disabled={cargando}
            className="flex-1 resize-none bg-slate-100 dark:bg-gray-800 border border-transparent focus:border-blue-300 dark:focus:border-blue-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-all max-h-28"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={enviar}
            disabled={!input.trim() || cargando}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
