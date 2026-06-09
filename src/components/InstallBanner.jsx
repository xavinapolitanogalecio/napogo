import { useState } from 'react'

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

export default function InstallBanner({ onInstalar, onDescartar, esIOS }) {
  const [paso, setPaso] = useState(0) // 0=banner, 1=instrucciones iOS

  if (esIOS && paso === 1) {
    return (
      <div className="fixed bottom-16 inset-x-0 z-40 px-3 pb-2 animate-in slide-in-from-bottom duration-300">
        <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-700">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
                N
              </div>
              <div>
                <p className="font-bold text-white text-sm">Instalar NapoGo</p>
                <p className="text-slate-400 text-xs">Sigue estos pasos en Safari</p>
              </div>
            </div>
            <button onClick={onDescartar} className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {[
              { n: 1, icono: <IconShare />, texto: <>Toca el botón <strong className="text-white">Compartir</strong> <span className="text-blue-400">⎙</span> en la barra de Safari</> },
              { n: 2, icono: null, texto: <>Desplázate y pulsa <strong className="text-white">"Añadir a pantalla de inicio"</strong></> },
              { n: 3, icono: null, texto: <>Confirma tocando <strong className="text-white">"Añadir"</strong> — ¡listo!</> },
            ].map(({ n, icono, texto }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {n}
                </div>
                <p className="text-slate-300 text-sm leading-snug flex items-center gap-1.5">{icono}{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-16 inset-x-0 z-40 px-3 pb-2">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Franja azul superior */}
        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

        <div className="flex items-center gap-3 px-4 py-3">
          {/* Logo */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm">
            N
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">Instala NapoGo</p>
            <p className="text-slate-400 text-xs mt-0.5 leading-tight">
              Añádela a tu pantalla de inicio para acceso rápido
            </p>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDescartar}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Ahora no
            </button>
            <button
              onClick={esIOS ? () => setPaso(1) : onInstalar}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <IconDownload />
              Instalar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
