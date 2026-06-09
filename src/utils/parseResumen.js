// ── Damerau-Levenshtein distance ─────────────────────────────────────────────
// Counts adjacent transpositions ("ta"↔"at") as a single edit,
// giving better results for typos than plain Levenshtein.
function distancia(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost)
      }
    }
  }
  return d[m][n]
}

function similitud(a, b) {
  const la = a.toLowerCase(), lb = b.toLowerCase()
  const maxLen = Math.max(la.length, lb.length)
  if (maxLen === 0) return 1
  return 1 - distancia(la, lb) / maxLen
}

// ── Fuzzy store matcher ───────────────────────────────────────────────────────
// Finds the best match for `candidato` among `conocidas`.
// Returns { tienda: string|null, sim: number }.
const UMBRAL = 0.65

function mejorCoincidencia(candidato, conocidas) {
  const lower = candidato.toLowerCase().trim()
  if (!lower || !conocidas.length) return { tienda: null, sim: 0 }

  let mejorTienda = null, mejorSim = 0

  for (const tienda of conocidas) {
    const tLower = tienda.toLowerCase()
    let sim = 0

    // 1. Exact (case-insensitive)
    if (lower === tLower) return { tienda, sim: 1 }

    // 2. One is a prefix of the other ("prat"→"prats", "matadeper"→"matadepera")
    //    Score = shorter / longer so short inputs don't over-match long names
    if (tLower.startsWith(lower) || lower.startsWith(tLower)) {
      sim = Math.min(lower.length, tLower.length) / Math.max(lower.length, tLower.length)
    }

    // 3. Full string Damerau-Levenshtein similarity
    sim = Math.max(sim, similitud(lower, tLower))

    if (sim > mejorSim) { mejorSim = sim; mejorTienda = tienda }
  }

  return { tienda: mejorSim >= UMBRAL ? mejorTienda : null, sim: mejorSim }
}

// ── Date extraction ───────────────────────────────────────────────────────────
export function extraerFecha(texto) {
  const m = texto.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (/\bayer\b/i.test(texto)) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return null
}

function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Text pre-processing ───────────────────────────────────────────────────────
// Words that appear between numbers and store names but are not part of a name
const CONECTORES = /\b(en|de|del|la|el|las|los|hoy|ayer|fecha|repartos?|total)\b/gi

function limpiarCandidato(texto) {
  return texto
    .replace(CONECTORES, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Only attempt fuzzy matching if the candidate is purely alphabetic text
// (avoids treating date fragments like "/05/2026" as store name attempts)
const SOLO_LETRAS = /^[A-Za-záéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑçÇ\s]+$/

// ── Main parser ───────────────────────────────────────────────────────────────
/**
 * Extracts store+count pairs from a natural language summary.
 *
 * Supported formats (all without needing "en"):
 *   "15 Corominas, 9 Prats"
 *   "15 en Corominas y 9 en Prats"
 *   "09 Prat\n03 girabau"
 *   "Fecha 13/05/2026, 5 corominas, 9 prat"
 *
 * Returns { entries: [{tienda, repartos, fecha}], errores: string[] }
 * - errores contains original candidate text for stores that couldn't be matched.
 */
export function parsearResumen(texto, tiendasConocidas = []) {
  if (!Array.isArray(tiendasConocidas)) tiendasConocidas = []
  const fecha   = extraerFecha(texto) ?? null
  const entries = new Map()   // tienda_lower → entry
  const errores = []

  // Split on: comma, semicolon, newline, " y " (Spanish "and")
  const segmentos = texto
    .split(/[,;\n]|\s+y\s+/i)
    .map(s => s.trim())
    .filter(Boolean)

  for (const seg of segmentos) {
    // Extract the first number in the segment
    const numMatch = seg.match(/\d+/)
    if (!numMatch) continue
    const repartos = parseInt(numMatch[0])
    if (repartos <= 0) continue

    // Remove the matched number and clean up connectors
    const candidato = limpiarCandidato(seg.replace(numMatch[0], ''))
    if (!candidato || candidato.length < 2) continue

    // Skip fragments that look like date/number noise, not a store name
    if (!SOLO_LETRAS.test(candidato)) continue

    if (!tiendasConocidas.length) {
      // No known stores — store as-is capitalised
      const nombre = candidato.charAt(0).toUpperCase() + candidato.slice(1).toLowerCase()
      entries.set(nombre.toLowerCase(), { tienda: nombre, repartos, fecha })
      continue
    }

    const { tienda } = mejorCoincidencia(candidato, tiendasConocidas)

    if (tienda) {
      entries.set(tienda.toLowerCase(), { tienda, repartos, fecha })
    } else {
      // Report unrecognised store back to the caller
      const display = candidato.charAt(0).toUpperCase() + candidato.slice(1).toLowerCase()
      if (!errores.includes(display)) errores.push(display)
    }
  }

  // Safety fallback: for known stores that are explicitly mentioned but the
  // segment split somehow missed them, scan the raw text with exact-name regex.
  for (const tienda of tiendasConocidas) {
    if (entries.has(tienda.toLowerCase())) continue
    const esc = tienda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const p   = new RegExp(`(\\d+)[^.]{0,20}${esc}|${esc}[^.]{0,20}?(\\d+)`, 'i')
    const m   = p.exec(texto)
    if (m) {
      entries.set(tienda.toLowerCase(), {
        tienda,
        repartos: parseInt(m[1] ?? m[2]),
        fecha,
      })
    }
  }

  return { entries: [...entries.values()], errores }
}
