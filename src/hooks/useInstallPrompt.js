import { useState, useEffect } from 'react'

export function useInstallPrompt() {
  const [prompt, setPrompt]         = useState(null)
  const [instalado, setInstalado]   = useState(false)
  const [descartado, setDescartado] = useState(
    () => localStorage.getItem('napogo_install_dismissed') === '1'
  )

  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const esStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  useEffect(() => {
    if (esStandalone) { setInstalado(true); return }

    function onPrompt(e) {
      e.preventDefault()
      setPrompt(e)
    }
    function onInstalled() { setInstalado(true); setPrompt(null) }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [esStandalone])

  async function instalar() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalado(true)
    setPrompt(null)
  }

  function descartar() {
    localStorage.setItem('napogo_install_dismissed', '1')
    setDescartado(true)
  }

  const mostrar = !instalado && !descartado && (prompt !== null || esIOS)

  return { mostrar, instalar, descartar, esIOS, prompt }
}
