import { useState } from 'react'

const mockRepartos = [
  { id: 1, cliente: 'María García', direccion: 'Calle Mayor 12, Madrid', estado: 'entregado', hora: '09:15', importe: 45.5 },
  { id: 2, cliente: 'Carlos López', direccion: 'Av. Constitución 34, Madrid', estado: 'entregado', hora: '10:30', importe: 28.0 },
  { id: 3, cliente: 'Ana Martínez', direccion: 'Plaza España 5, Madrid', estado: 'en_camino', hora: '11:45', importe: 67.2 },
  { id: 4, cliente: 'Pedro Sánchez', direccion: 'C/ Fuencarral 89, Madrid', estado: 'pendiente', hora: '12:00', importe: 33.8 },
  { id: 5, cliente: 'Laura Fernández', direccion: 'Gran Vía 101, Madrid', estado: 'pendiente', hora: '13:30', importe: 52.0 },
  { id: 6, cliente: 'Javier Ruiz', direccion: 'C/ Alcalá 200, Madrid', estado: 'pendiente', hora: '14:00', importe: 19.5 },
]

const estadoConfig = {
  entregado: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700' },
  en_camino: { label: 'En camino', color: 'bg-blue-100 text-blue-700' },
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
}

function StatCard({ icon, label, value, sub, colorClass }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [repartos, setRepartos] = useState(mockRepartos)
  const [filtro, setFiltro] = useState('todos')

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const totales = {
    total: repartos.length,
    entregados: repartos.filter(r => r.estado === 'entregado').length,
    enCamino: repartos.filter(r => r.estado === 'en_camino').length,
    pendientes: repartos.filter(r => r.estado === 'pendiente').length,
    ganancias: repartos.filter(r => r.estado === 'entregado').reduce((sum, r) => sum + r.importe, 0),
  }

  const filtrados = filtro === 'todos' ? repartos : repartos.filter(r => r.estado === filtro)

  function marcarEntregado(id) {
    setRepartos(prev => prev.map(r => r.id === id ? { ...r, estado: 'entregado' } : r))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Repartos</h1>
            <p className="text-sm text-slate-500 capitalize mt-0.5">{today}</p>
          </div>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="📦" label="Total hoy" value={totales.total} sub="repartos" colorClass="bg-slate-100" />
        <StatCard icon="✅" label="Entregados" value={totales.entregados} sub="completados" colorClass="bg-emerald-50" />
        <StatCard icon="⏳" label="Pendientes" value={totales.pendientes} sub="por entregar" colorClass="bg-amber-50" />
        <StatCard
          icon="💶"
          label="Ganancias"
          value={`${totales.ganancias.toFixed(2)}€`}
          sub="entregados"
          colorClass="bg-blue-50"
        />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-slate-700">Progreso del día</span>
          <span className="text-sm text-slate-500">
            {totales.entregados}/{totales.total} entregados
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(totales.entregados / totales.total) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Entregados</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> En camino</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Pendientes</span>
        </div>
      </div>

      {/* Repartos list */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Lista de repartos</h2>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {['todos', 'pendiente', 'en_camino', 'entregado'].map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filtro === f ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'todos' ? 'Todos' : estadoConfig[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtrados.map(reparto => (
            <div
              key={reparto.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                  {reparto.id}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{reparto.cliente}</p>
                  <p className="text-xs text-slate-500 truncate">{reparto.direccion}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700">{reparto.importe.toFixed(2)}€</p>
                  <p className="text-xs text-slate-400">{reparto.hora}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoConfig[reparto.estado].color}`}>
                  {estadoConfig[reparto.estado].label}
                </span>
                {reparto.estado !== 'entregado' && (
                  <button
                    onClick={() => marcarEntregado(reparto.id)}
                    className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors text-sm"
                    title="Marcar como entregado"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">No hay repartos en este estado</p>
          )}
        </div>
      </div>
    </div>
  )
}
