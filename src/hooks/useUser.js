import { useState } from 'react'

const STORAGE_USER = 'repartos_usuario'
const STORAGE_HISTORIAL = 'repartos_historial'

function readStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

export function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

export function useUser() {
  const [usuario, setUsuario] = useState(() => readStorage(STORAGE_USER, null))

  function guardar(datos) {
    const u = { ...datos, creadoEn: new Date().toISOString() }
    localStorage.setItem(STORAGE_USER, JSON.stringify(u))
    setUsuario(u)
  }

  function actualizar(parcial) {
    const u = { ...usuario, ...parcial }
    localStorage.setItem(STORAGE_USER, JSON.stringify(u))
    setUsuario(u)
  }

  function reset() {
    localStorage.removeItem(STORAGE_USER)
    localStorage.removeItem(STORAGE_HISTORIAL)
    setUsuario(null)
  }

  return { usuario, guardar, actualizar, reset }
}

export function useHistorial() {
  const [historial, setHistorial] = useState(() => readStorage(STORAGE_HISTORIAL, []))

  // Replaces existing entry for same date+tienda with new value
  function agregar(entradas) {
    const hoy = fechaHoy()
    const tiendas = entradas.map(e => e.tienda.toLowerCase())
    const filtrado = historial.filter(
      e => !(e.fecha === hoy && tiendas.includes(e.tienda.toLowerCase()))
    )
    const nuevos = [...filtrado, ...entradas.map(e => ({ ...e, fecha: hoy }))]
    localStorage.setItem(STORAGE_HISTORIAL, JSON.stringify(nuevos))
    setHistorial(nuevos)
  }

  return { historial, agregar }
}
