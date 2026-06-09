import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import SetupPerfil from './pages/SetupPerfil'
import PaywallPage from './pages/PaywallPage'
import DashboardPage from './pages/DashboardPage'
import PerfilPage from './pages/PerfilPage'
import NavBar from './components/NavBar'
import ChatPage from './pages/ChatPage'
import Toast from './components/Toast'
import { useOfflineQueue } from './hooks/useOfflineQueue'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import InstallBanner from './components/InstallBanner'

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 border-[3px] border-blue-100 dark:border-blue-900/40 border-t-blue-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-blue-600 font-black text-xl select-none">N</span>
          </div>
        </div>
        <p className="text-sm text-slate-400 dark:text-gray-500 font-semibold tracking-widest uppercase">NapoGo</p>
      </div>
    </div>
  )
}

function BannerOffline() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-bold py-1.5 flex items-center justify-center gap-1.5 select-none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 shrink-0">
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0" strokeLinecap="round" />
        <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
      </svg>
      Modo Offline activo · Los repartos se sincronizarán al recuperar conexión
    </div>
  )
}

export default function App() {
  const [authState, setAuthState] = useState('loading')
  const [session, setSession]   = useState(null)
  const [perfil, setPerfil]     = useState(null)
  const [historial, setHistorial] = useState([])
  const [pagina, setPagina]     = useState('dashboard')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark') === '1')
  const [toast, setToast]       = useState(null)

  const retryTimerRef  = useRef(null)
  const retryTimer2Ref = useRef(null)

  const { isOnline, queue, enqueue, clearQueue } = useOfflineQueue()
  const { mostrar: mostrarInstall, instalar, descartar, esIOS } = useInstallPrompt()

  // Sincroniza la clase `dark` en <html> con el estado
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('dark', darkMode ? '1' : '0')
  }, [darkMode])

  // ─── Auto-sync cola offline cuando vuelve la conexión ───────────────
  useEffect(() => {
    if (!isOnline || !session?.user?.id) return
    const uid = session.user.id

    const items = (() => {
      try { return JSON.parse(localStorage.getItem('repartos_offline_queue') ?? '[]') } catch { return [] }
    })()
    if (!items.length) return

    clearQueue()

    Promise.all(items.map(async ({ filas }) => {
      try {
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
        return true
      } catch { return false }
    })).then(results => {
      const n = results.filter(Boolean).length
      if (n > 0) {
        setToast(`✅ Repartos guardados sin conexión sincronizados con éxito`)
        fetchHistorial(uid)
      }
    })
  }, [isOnline, session?.user?.id]) // eslint-disable-line

  // ─── Carga inicial + sign-out reactivo ───────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!s) { setAuthState('auth'); return }
      setSession(s)
      await cargarPerfilYHistorial(s)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        setSession(null); setPerfil(null); setHistorial([]); setAuthState('auth')
      }
    })
    return () => {
      subscription.unsubscribe()
      clearTimeout(retryTimerRef.current)
      clearTimeout(retryTimer2Ref.current)
    }
  }, [])

  // ─── Supabase Realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return
    const uid = session.user.id

    // Repartos — refresca historial en cambios
    const repartosChannel = supabase
      .channel(`repartos_rt_${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repartos' },
        (payload) => {
          const rowUid = payload.new?.user_id ?? payload.old?.user_id
          if (!rowUid || rowUid === uid) fetchHistorial(uid)
        },
      )
      .subscribe()

    // Profiles — detecta cambio de suscripcion_activa en tiempo real
    const profilesChannel = supabase
      .channel(`profiles_rt_${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        async (payload) => {
          const nuevo = payload.new
          if (!nuevo) return
          setPerfil(nuevo)
          if (nuevo.suscripcion_activa) {
            await fetchHistorial(uid)
            setAuthState('app')
          } else {
            setAuthState('paywall')
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(repartosChannel)
      supabase.removeChannel(profilesChannel)
    }
  }, [session?.user?.id])

  // ─── Helpers de carga ───────────────────────────────────────────────
  async function cargarPerfilYHistorial(s) {
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).single(),
      supabase.from('repartos').select('id,user_id,tienda_nombre,cantidad,fecha').eq('user_id', s.user.id).order('fecha', { ascending: false }),
    ])
    setPerfil(p ?? null)
    setHistorial(h ?? [])
    if (!p) {
      const meta = s.user.user_metadata ?? {}
      if (meta.nombre && Array.isArray(meta.tiendas) && meta.tiendas.length > 0) {
        const { data: nuevo, error: insErr } = await supabase
          .from('profiles')
          .insert({ id: s.user.id, nombre: meta.nombre, correo: s.user.email, tiendas: meta.tiendas })
          .select().single()
        if (!insErr && nuevo) {
          setPerfil(nuevo)
          setAuthState(nuevo.suscripcion_activa ? 'app' : 'paywall')
          return
        }
      }
      setAuthState('setup')
      return
    }
    if (!p.suscripcion_activa) { setAuthState('paywall'); return }
    setAuthState('app')
  }

  async function fetchHistorial(uid) {
    const id = uid ?? session?.user?.id
    if (!id) return
    const { data } = await supabase
      .from('repartos')
      .select('id,user_id,tienda_nombre,cantidad,fecha')
      .eq('user_id', id)
      .order('fecha', { ascending: false })
    setHistorial(data ?? [])
  }

  function refreshHistorial() {
    fetchHistorial()
    clearTimeout(retryTimerRef.current)
    clearTimeout(retryTimer2Ref.current)
    retryTimerRef.current  = setTimeout(() => fetchHistorial(), 3000)
    retryTimer2Ref.current = setTimeout(() => fetchHistorial(), 7000)
  }

  // ─── Mutaciones optimistas ───────────────────────────────────────────
  function actualizarFilaHistorial(id, cambios) {
    setHistorial(prev => prev.map(e => e.id === id ? { ...e, ...cambios } : e))
  }

  function eliminarFilaHistorial(id) {
    setHistorial(prev => prev.filter(e => e.id !== id))
  }

  // ─── Callbacks de páginas ────────────────────────────────────────────
  async function handleAuthSuccess(s, p) {
    setSession(s)
    if (p) {
      setPerfil(p)
      await fetchHistorial(s.user.id)
      setAuthState(p.suscripcion_activa ? 'app' : 'paywall')
      return
    }
    const meta = s.user.user_metadata ?? {}
    if (meta.nombre && Array.isArray(meta.tiendas) && meta.tiendas.length > 0) {
      const { data: nuevo, error: insErr } = await supabase
        .from('profiles')
        .insert({ id: s.user.id, nombre: meta.nombre, correo: s.user.email, tiendas: meta.tiendas })
        .select().single()
      if (!insErr && nuevo) {
        setPerfil(nuevo)
        setAuthState(nuevo.suscripcion_activa ? 'app' : 'paywall')
        return
      }
    }
    setPerfil(null); setHistorial([]); setAuthState('setup')
  }

  async function handleSubscriptionVerified() {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    if (data?.suscripcion_activa) {
      setPerfil(data)
      await fetchHistorial(session.user.id)
      setAuthState('app')
    }
  }

  function handleSetupComplete(p) {
    setPerfil(p); setHistorial([])
    setAuthState(p?.suscripcion_activa ? 'app' : 'paywall')
  }

  async function actualizarPerfil(cambios) {
    const { data, error } = await supabase
      .from('profiles').update(cambios).eq('id', session.user.id).select().single()
    if (!error && data) setPerfil(data)
    return { error }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  // ─── Render ──────────────────────────────────────────────────────────
  if (authState === 'loading') return <Spinner />
  if (authState === 'auth')    return <AuthPage onSuccess={handleAuthSuccess} />
  if (authState === 'setup')   return <SetupPerfil session={session} onComplete={handleSetupComplete} />
  if (authState === 'paywall') return <PaywallPage session={session} onSubscribed={handleSubscriptionVerified} />

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 pb-16 transition-colors duration-200 ${!isOnline ? 'pt-7' : ''}`}>
      {!isOnline && <BannerOffline />}

      {toast && (
        <Toast mensaje={toast} onClose={() => setToast(null)} />
      )}

      {pagina === 'dashboard' && (
        <DashboardPage
          usuario={perfil}
          historial={historial}
          onRefresh={refreshHistorial}
          onActualizarFila={actualizarFilaHistorial}
          onEliminarFila={eliminarFilaHistorial}
        />
      )}
      {pagina === 'perfil' && (
        <PerfilPage
          usuario={perfil}
          onActualizar={actualizarPerfil}
          onLogout={logout}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />
      )}
      {pagina === 'chat' && (
        <ChatPage
          perfil={perfil}
          session={session}
          onRepartoGuardado={refreshHistorial}
          isOnline={isOnline}
          onOfflineEnqueue={enqueue}
        />
      )}
      {mostrarInstall && (
        <InstallBanner onInstalar={instalar} onDescartar={descartar} esIOS={esIOS} />
      )}
      <NavBar pagina={pagina} onCambiar={setPagina} />
    </div>
  )
}
