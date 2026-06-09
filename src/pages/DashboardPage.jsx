import { useState, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const COLORES = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#f97316', '#22c55e',
  '#ec4899', '#84cc16',
]

const TARIFA_DEFAULT = 1.00

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function etiquetaMes(m) {
  const [y, mo] = m.split('-')
  return `${MESES_ES[parseInt(mo) - 1]} ${y}`
}

function generarMeses() {
  const ahora = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { valor, etiqueta: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}` }
  })
}

function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// UI-only: when fecha is NULL, display today — never writes to DB
function fechaEfectiva(f) { return f ?? fechaHoy() }

function formatFecha(f) {
  const [y, m, d] = fechaEfectiva(f).split('-')
  return `${d}/${m}/${y}`
}

function capitalize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

const MESES_OPCIONES = generarMeses()

function saludoDelDia() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'Buenos días'
  if (h >= 14 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaLarga() {
  const hoy = new Date()
  const dias  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]}`
}

// ── Pivot builder ────────────────────────────────────────────────────────────
// Converts flat rows into: [{ fecha, celdas: Map(tienda_lower → {id,cantidad,tienda_nombre}), registros, total }]
// sorted newest-first.
function pivotarPorFecha(filas) {
  const mapFecha = new Map()
  for (const f of filas) {
    const fecha  = fechaEfectiva(f.fecha)
    const tLower = f.tienda_nombre?.toLowerCase()
    if (!tLower) continue
    if (!mapFecha.has(fecha)) mapFecha.set(fecha, new Map())
    mapFecha.get(fecha).set(tLower, {
      id:            f.id,
      cantidad:      Number(f.cantidad) || 0,
      tienda_nombre: f.tienda_nombre,
    })
  }
  return [...mapFecha.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([fecha, celdas]) => {
      const registros = [...celdas.values()]
      return { fecha, celdas, registros, total: registros.reduce((s, r) => s + r.cantidad, 0) }
    })
}

// ── Small UI components ──────────────────────────────────────────────────────
function IconTienda({ color }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0" style={{ color }}>
      <path d="M2.879 7.121A3 3 0 007.5 6.66a2.997 2.997 0 002.5 1.34 2.997 2.997 0 002.5-1.34 3 3 0 004.621.461c.33-.304.602-.674.79-1.093A3.978 3.978 0 0018 5c0-.088-.003-.175-.009-.261a2 2 0 00-.183-.67l-1.571-3.14A2 2 0 0014.448 0H5.552a2 2 0 00-1.789 1.107L2.192 4.248A2 2 0 002 5.2c0 .251.033.496.097.731.188.42.46.789.782 1.09zM2 8.854V15a2 2 0 002 2h12a2 2 0 002-2V8.854A4.496 4.496 0 017.5 8.16 4.496 4.496 0 012 8.854zM9 11a1 1 0 112 0v3a1 1 0 11-2 0v-3z" />
    </svg>
  )
}

function IconChevron({ abierto }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

function IconX() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}

function TooltipBarra({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 shadow-lg">
      <p className="font-bold text-slate-800 dark:text-gray-100 text-sm">{capitalize(payload[0].payload.tienda)}</p>
      <p className="text-slate-500 dark:text-gray-400 text-sm mt-0.5">Repartos: <span className="font-bold text-slate-800 dark:text-gray-100">{payload[0].value}</span></p>
    </div>
  )
}

function KPICard({ label, value, color, iconBg, icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm p-4 transition-all active:scale-[0.97]">
      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center text-base mb-3 select-none`}>
        {icon}
      </div>
      <p className={`text-2xl font-black leading-none ${color}`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1.5 leading-none">{label}</p>
    </div>
  )
}

function GananciasCard({ valor }) {
  const formatted = valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-sm p-4 transition-all active:scale-[0.97]">
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-base mb-3 select-none">
        💶
      </div>
      <p className="text-2xl font-black leading-none text-white">{formatted} €</p>
      <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1.5 leading-none">Ganancias Est.</p>
    </div>
  )
}

function TiendaCard({ tienda, repartos, pct, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
      <div style={{ height: 4, backgroundColor: color }} />
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-2.5 truncate flex items-center gap-1.5" style={{ color }}>
          <IconTienda color={color} />
          {tienda}
        </p>
        <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{repartos}</p>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-1.5">{pct}% del total</p>
        <div className="mt-2 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  )
}

// ── PDF export ───────────────────────────────────────────────────────────────
function generarPDF({ usuario, historialMesFiltrado, tiendas, tarifas, mes, gananciasEstimadas, totalRepartos }) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const C_AZUL  = [37, 99, 235]
  const C_GRIS  = [100, 116, 139]
  const C_NEGRO = [15, 23, 42]
  const C_FONDO = [248, 250, 252]

  function tarifaDe(tienda) {
    const k = Object.keys(tarifas).find(k => k.toLowerCase() === tienda.toLowerCase())
    return k ? Number(tarifas[k]) : 1.0
  }

  // ── Cabecera azul ──────────────────────────────────────────────────────
  doc.setFillColor(...C_AZUL)
  doc.roundedRect(14, 10, pageW - 28, 30, 4, 4, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('NapoGo', 22, 26)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text('Resumen de Repartos', 22, 34)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(etiquetaMes(mes), pageW - 22, 26, { align: 'right' })

  // ── Datos del repartidor ───────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C_NEGRO)
  doc.text(usuario.nombre, 14, 52)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C_GRIS)
  doc.text(usuario.correo ?? '', 14, 58)

  const fechaGen = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFontSize(8)
  doc.text(`Generado el ${fechaGen}`, pageW - 14, 52, { align: 'right' })

  // ── Tabla principal: fecha × tienda ───────────────────────────────────
  const porFecha = {}
  for (const e of historialMesFiltrado) {
    const f = e.fecha ?? ''
    if (!porFecha[f]) porFecha[f] = []
    porFecha[f].push(e)
  }

  const filas = []
  Object.keys(porFecha).sort().forEach(fecha => {
    const rows = [...porFecha[fecha]].sort((a, b) => (a.tienda_nombre ?? '').localeCompare(b.tienda_nombre ?? ''))
    rows.forEach((r, i) => {
      const tarifa = tarifaDe(r.tienda_nombre)
      filas.push([
        i === 0 ? formatFecha(fecha) : '',
        capitalize(r.tienda_nombre ?? ''),
        { content: r.cantidad, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: `${tarifa.toFixed(2)} €`, styles: { halign: 'right', textColor: C_GRIS } },
        { content: `${(r.cantidad * tarifa).toFixed(2)} €`, styles: { halign: 'right', fontStyle: 'bold' } },
      ])
    })
  })

  autoTable(doc, {
    startY: 65,
    head: [['Fecha', 'Tienda', 'Repartos', 'Tarifa', 'Subtotal']],
    body: filas,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: C_NEGRO, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: C_AZUL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: C_FONDO },
    columnStyles: {
      0: { cellWidth: 24, textColor: C_GRIS, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26 },
      3: { cellWidth: 28 },
      4: { cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Resumen por tienda ─────────────────────────────────────────────────
  const afterTable = doc.lastAutoTable.finalY + 10

  const resumenFilas = tiendas
    .map(t => {
      const total = historialMesFiltrado
        .filter(e => e.tienda_nombre?.toLowerCase() === t.toLowerCase())
        .reduce((s, e) => s + (Number(e.cantidad) || 0), 0)
      const tarifa = tarifaDe(t)
      return [capitalize(t), total, `${tarifa.toFixed(2)} €`, `${(total * tarifa).toFixed(2)} €`]
    })
    .filter(r => r[1] > 0)

  if (resumenFilas.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C_NEGRO)
    doc.text('Resumen por tienda', 14, afterTable)

    autoTable(doc, {
      startY: afterTable + 5,
      head: [['Tienda', 'Repartos', 'Tarifa', 'Total €']],
      body: resumenFilas,
      foot: [['TOTAL', totalRepartos, '—', `${gananciasEstimadas.toFixed(2)} €`]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: C_NEGRO, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [241, 245, 249], textColor: C_GRIS, fontStyle: 'bold' },
      footStyles: { fillColor: C_AZUL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      alternateRowStyles: { fillColor: C_FONDO },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Pie de página ──────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 190, 200)
  doc.text('NapoGo · Tu asistente de repartos', pageW / 2, pageH - 10, { align: 'center' })

  doc.save(`NapoGo_${(usuario.nombre ?? 'reparto').replace(/\s+/g, '_')}_${mes}.pdf`)
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage({ usuario, historial, onRefresh, onActualizarFila, onEliminarFila }) {
  const [mes, setMes] = useState(mesActual)
  const [exportando, setExportando]   = useState(false)
  const [editandoId, setEditandoId]   = useState(null)
  const [editForm, setEditForm]       = useState({ tienda_nombre: '', cantidad: '' })
  const [borrandoId, setBorrandoId]   = useState(null)
  const [guardando, setGuardando]     = useState(false)
  const [editError, setEditError]     = useState(null)
  const [fechaExpandida, setFechaExpandida] = useState(null)
  const [borrandoFecha, setBorrandoFecha]   = useState(null)

  // ── Data scoped to selected month ─────────────────────────────────────────
  const historialMes = historial.filter(e => fechaEfectiva(e.fecha).startsWith(mes))

  // Only official stores — deduplicated case-insensitively to prevent double cards
  const tiendas = (() => {
    const seen = new Set()
    return (usuario.tiendas ?? []).filter(t => {
      const key = t.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()
  const historialMesFiltrado = historialMes.filter(e =>
    tiendas.some(t => t.toLowerCase() === e.tienda_nombre?.toLowerCase())
  )

  const totalRepartos  = historialMesFiltrado.reduce((s, e) => s + (Number(e.cantidad) || 0), 0)
  const tiendasActivas = new Set(historialMesFiltrado.map(e => e.tienda_nombre?.toLowerCase()).filter(Boolean)).size
  const registros      = historialMesFiltrado.length

  function totalTienda(tienda) {
    return historialMesFiltrado
      .filter(e => e.tienda_nombre?.toLowerCase() === tienda.toLowerCase())
      .reduce((s, e) => s + (Number(e.cantidad) || 0), 0)
  }

  const tarifas = usuario.tarifas ?? {}
  function tarifaTienda(tienda) {
    const key = Object.keys(tarifas).find(k => k.toLowerCase() === tienda.toLowerCase())
    return key ? Number(tarifas[key]) : TARIFA_DEFAULT
  }
  const gananciasEstimadas = tiendas.reduce((sum, t) => sum + totalTienda(t) * tarifaTienda(t), 0)

  const pivotRows = pivotarPorFecha(historialMesFiltrado)

  const barData = tiendas.map((tienda, i) => ({
    tienda, repartos: totalTienda(tienda), fill: COLORES[i % COLORES.length],
  }))
  const maxBar = Math.max(...barData.map(d => d.repartos), 0)
  const yMax   = Math.ceil(Math.max(maxBar * 1.3, 20) / 10) * 10

  const primerNombre = (usuario.nombre ?? '').split(' ')[0] || 'Hola'
  const saludoTexto  = saludoDelDia()
  const fechaHoyStr  = fechaLarga()
  const hoyStr       = fechaHoy()
  const totalHoy     = historial
    .filter(e => fechaEfectiva(e.fecha) === hoyStr &&
      tiendas.some(t => t.toLowerCase() === e.tienda_nombre?.toLowerCase()))
    .reduce((s, e) => s + (Number(e.cantidad) || 0), 0)

  // ── PDF export ────────────────────────────────────────────────────────────
  async function exportarPDF() {
    if (exportando || historialMesFiltrado.length === 0) return
    setExportando(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      generarPDF({ usuario, historialMesFiltrado, tiendas, tarifas, mes, gananciasEstimadas, totalRepartos })
    } finally {
      setExportando(false)
    }
  }

  // ── Individual row edit ───────────────────────────────────────────────────
  function iniciarEdicion(fila) {
    setEditandoId(fila.id)
    setBorrandoId(null)
    setBorrandoFecha(null)
    setEditError(null)
    setEditForm({ tienda_nombre: fila.tienda_nombre ?? '', cantidad: String(fila.cantidad ?? '') })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setEditError(null)
    setEditForm({ tienda_nombre: '', cantidad: '' })
  }

  async function guardarEdicion() {
    if (!editandoId || guardando) return
    setGuardando(true)
    setEditError(null)
    const cambios = {
      tienda_nombre: editForm.tienda_nombre.trim(),
      cantidad:      Number(editForm.cantidad) || 0,
    }
    onActualizarFila?.(editandoId, cambios)
    setEditandoId(null)
    const { data, error } = await supabase.from('repartos').update(cambios).eq('id', editandoId).select()
    setGuardando(false)
    if (error || !data?.length) {
      setEditError(error?.message ?? 'Sin filas actualizadas — verifica permisos RLS.')
      onRefresh?.()
      return
    }
    onRefresh?.()
  }

  async function borrarFila(id) {
    if (borrandoId !== id) { setBorrandoId(id); setEditandoId(null); setEditError(null); return }
    onEliminarFila?.(id)
    setBorrandoId(null)
    const { error } = await supabase.from('repartos').delete().eq('id', id)
    if (error) { setEditError(`Error al borrar: ${error.message}`); onRefresh?.(); return }
    onRefresh?.()
  }

  // ── Date-row (pivot) actions ──────────────────────────────────────────────
  function toggleFecha(fecha) {
    setFechaExpandida(prev => prev === fecha ? null : fecha)
    setEditandoId(null)
    setBorrandoId(null)
  }

  async function borrarFecha(fecha, ids) {
    ids.forEach(id => onEliminarFila?.(id))
    setBorrandoFecha(null)
    if (fechaExpandida === fecha) setFechaExpandida(null)
    const { error } = await supabase.from('repartos').delete().in('id', ids)
    if (error) { setEditError(`Error al borrar: ${error.message}`); onRefresh?.() }
    else onRefresh?.()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Greeting header ── */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 dark:from-blue-800 dark:via-blue-800 dark:to-indigo-900 rounded-2xl p-5 mb-5 shadow-lg shadow-blue-200/50 dark:shadow-none overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-8 bottom-[-20px] w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3">
          {/* Left: avatar + greeting */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-lg select-none">
              {primerNombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-blue-200 text-xs font-medium">{saludoTexto} 👋</p>
              <h1 className="text-xl font-black text-white leading-tight truncate">
                ¡Hola, {primerNombre}!
              </h1>
              <p className="text-blue-300 text-[11px] mt-0.5 capitalize">{fechaHoyStr}</p>
            </div>
          </div>

          {/* Right: today's count */}
          {totalHoy > 0 ? (
            <div className="text-right shrink-0">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Hoy</p>
              <p className="text-3xl font-black text-white tabular-nums leading-tight">{totalHoy}</p>
              <p className="text-blue-300 text-[10px]">repartos</p>
            </div>
          ) : (
            <div className="text-right shrink-0">
              <p className="text-blue-200 text-[10px] font-medium leading-snug">Sin repartos<br />registrados hoy</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Month selector row ── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-sm font-semibold text-slate-500 dark:text-gray-400 hidden sm:block">Resumen del mes</p>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition-colors"
          >
            {MESES_OPCIONES.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
          <button
            onClick={() => onRefresh?.()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            Actualizar
          </button>
          <button
            onClick={exportarPDF}
            disabled={exportando || historialMesFiltrado.length === 0}
            title={historialMesFiltrado.length === 0 ? 'Sin datos para exportar' : 'Exportar resumen en PDF'}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            {exportando ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
            )}
            <span className="hidden sm:inline">{exportando ? 'Generando…' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPICard label="Total repartos"  value={totalRepartos}  color="text-blue-600 dark:text-blue-400"    iconBg="bg-blue-50 dark:bg-blue-900/20"    icon="📦" />
        <GananciasCard valor={gananciasEstimadas} />
        <KPICard label="Tiendas activas" value={tiendasActivas} color="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-900/20" icon="🏪" />
        <KPICard label="Registros"       value={registros}      color="text-amber-600 dark:text-amber-400"    iconBg="bg-amber-50 dark:bg-amber-900/20"   icon="📅" />
      </div>

      {/* ── Store cards ── */}
      {tiendas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
          {tiendas.map((tienda, i) => {
            const repartos = totalTienda(tienda)
            const pct = totalRepartos > 0 ? Math.round((repartos / totalRepartos) * 100) : 0
            return <TiendaCard key={tienda} tienda={tienda} repartos={repartos} pct={pct} color={COLORES[i % COLORES.length]} />
          })}
        </div>
      )}

      {/* ── Sin datos ── */}
      {historialMesFiltrado.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm p-10 text-center mb-5 transition-colors">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-bold text-slate-600 dark:text-gray-300">Sin datos para {etiquetaMes(mes)}</p>
          <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">Usa el chat para registrar tus repartos del día</p>
        </div>
      )}

      {/* ── Pivot table: one row per date, one column per store ── */}
      {pivotRows.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm mb-5 transition-colors">
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 dark:text-gray-100">Últimos movimientos</h2>
            <span className="text-xs text-slate-400 dark:text-gray-500 font-medium">{etiquetaMes(mes)}</span>
          </div>

          {editError && (
            <div className="mx-5 mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
              ⚠️ {editError}
            </div>
          )}

          <div className="overflow-x-auto pb-5 px-5">
            <table className="w-full text-sm" style={{ minWidth: `${Math.max(480, 120 + tiendas.length * 72 + 72 + 80)}px` }}>
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-gray-700">
                  {/* Sticky date column */}
                  <th className="py-2.5 pr-4 text-left font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 z-10">
                    Fecha
                  </th>
                  {/* One column per official store */}
                  {tiendas.map((t, i) => (
                    <th key={t} className="py-2.5 px-2 text-center font-semibold whitespace-nowrap" style={{ color: COLORES[i % COLORES.length] }}>
                      <span className="block max-w-[80px] truncate mx-auto" title={t}>{t}</span>
                    </th>
                  ))}
                  {/* Total */}
                  <th className="py-2.5 px-3 text-right font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">
                    Total
                  </th>
                  {/* Actions (no label) */}
                  <th className="py-2.5 pl-2 w-[72px]" />
                </tr>
              </thead>

              <tbody>
                {pivotRows.map(row => {
                  const expandido = fechaExpandida === row.fecha
                  const borrando  = borrandoFecha  === row.fecha

                  return (
                    <Fragment key={row.fecha}>

                      {/* ── Summary row ── */}
                      <tr className={`border-b border-slate-50 dark:border-gray-700/50 transition-colors ${
                        borrando  ? 'bg-red-50/40 dark:bg-red-900/20'
                        : expandido ? 'bg-blue-50/30 dark:bg-blue-900/10'
                        : 'hover:bg-slate-50/50 dark:hover:bg-gray-700/20'
                      }`}>
                        {/* Date — sticky */}
                        <td className={`py-3 pr-4 text-xs font-bold whitespace-nowrap sticky left-0 z-10 transition-colors ${
                          borrando  ? 'bg-red-50/60 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                          : expandido ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300'
                        }`}>
                          {formatFecha(row.fecha)}
                        </td>

                        {/* Store cells */}
                        {tiendas.map((t, i) => {
                          const celda = row.celdas.get(t.toLowerCase())
                          return (
                            <td key={t} className="py-3 px-2 text-center tabular-nums">
                              {celda
                                ? <span className="font-bold text-slate-800 dark:text-gray-100">{celda.cantidad}</span>
                                : <span className="text-slate-200 dark:text-gray-700 select-none font-normal">—</span>
                              }
                            </td>
                          )
                        })}

                        {/* Total */}
                        <td className="py-3 px-3 text-right tabular-nums">
                          <span className="font-black text-blue-600 dark:text-blue-400">{row.total}</span>
                        </td>

                        {/* Row actions */}
                        <td className="py-3 pl-2 text-right whitespace-nowrap">
                          {borrando ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => borrarFecha(row.fecha, row.registros.map(r => r.id))}
                                title="Confirmar borrado"
                                className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors"
                              >
                                <IconCheck />
                              </button>
                              <button
                                onClick={() => setBorrandoFecha(null)}
                                title="Cancelar"
                                className="w-7 h-7 bg-slate-200 dark:bg-gray-600 text-slate-600 dark:text-gray-300 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <IconX />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => toggleFecha(row.fecha)}
                                title={expandido ? 'Cerrar' : 'Editar registros del día'}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                  expandido
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                    : 'bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600'
                                }`}
                              >
                                <IconChevron abierto={expandido} />
                              </button>
                              <button
                                onClick={() => { setBorrandoFecha(row.fecha); setEditandoId(null) }}
                                title="Borrar día completo"
                                className="w-7 h-7 bg-slate-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-400 dark:text-gray-500 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* ── Expanded detail panel (spans all columns) ── */}
                      {expandido && (
                        <tr>
                          <td colSpan={tiendas.length + 3} className="py-0 border-b border-blue-100 dark:border-blue-900/40">
                            <div className="bg-slate-50 dark:bg-gray-700/30 px-5 py-3 space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                Editar registros del {formatFecha(row.fecha)}
                              </p>
                              {row.registros.map(fila => {
                                const editando     = editandoId === fila.id
                                const borrandoFila = borrandoId  === fila.id
                                return (
                                  <div
                                    key={fila.id}
                                    className={`flex items-center gap-3 text-sm rounded-xl px-3 py-2.5 transition-colors ${
                                      editando     ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                                      : borrandoFila ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                                      : 'bg-white dark:bg-gray-700 border border-slate-100 dark:border-gray-600'
                                    }`}
                                  >
                                    <span className="flex-1 font-semibold text-slate-700 dark:text-gray-200 truncate">
                                      {capitalize(fila.tienda_nombre)}
                                    </span>

                                    {editando ? (
                                      <>
                                        <input
                                          type="number" min="0"
                                          value={editForm.cantidad}
                                          onChange={e => setEditForm(f => ({ ...f, cantidad: e.target.value }))}
                                          className="w-20 border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1.5 text-sm text-right bg-white dark:bg-gray-800 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <button onClick={guardarEdicion} disabled={guardando}
                                          className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center shrink-0">
                                          <IconCheck />
                                        </button>
                                        <button onClick={cancelarEdicion}
                                          className="w-8 h-8 bg-slate-200 dark:bg-gray-600 text-slate-600 dark:text-gray-300 rounded-lg flex items-center justify-center shrink-0">
                                          <IconX />
                                        </button>
                                      </>
                                    ) : borrandoFila ? (
                                      <>
                                        <span className="text-xs text-red-500 dark:text-red-400 font-bold">¿Borrar?</span>
                                        <button onClick={() => borrarFila(fila.id)}
                                          className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shrink-0">
                                          <IconCheck />
                                        </button>
                                        <button onClick={() => setBorrandoId(null)}
                                          className="w-8 h-8 bg-slate-200 dark:bg-gray-600 text-slate-600 dark:text-gray-300 rounded-lg flex items-center justify-center shrink-0">
                                          <IconX />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-black text-slate-800 dark:text-gray-100 tabular-nums text-base">
                                          {fila.cantidad}
                                        </span>
                                        <button onClick={() => iniciarEdicion(fila)} title="Editar"
                                          className="w-8 h-8 bg-slate-100 dark:bg-gray-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-slate-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                                          <IconEdit />
                                        </button>
                                        <button onClick={() => borrarFila(fila.id)} title="Borrar"
                                          className="w-8 h-8 bg-slate-100 dark:bg-gray-600 hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg flex items-center justify-center shrink-0">
                                          <IconTrash />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}

                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bar chart ── */}
      {totalRepartos > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 mb-5 transition-colors">
          <h2 className="font-bold text-slate-800 dark:text-gray-100 mb-4">
            Comparativa de tiendas — {etiquetaMes(mes)}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="tienda" tickFormatter={capitalize} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, yMax]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipBarra />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="repartos" radius={[6, 6, 0, 0]} maxBarSize={64}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
