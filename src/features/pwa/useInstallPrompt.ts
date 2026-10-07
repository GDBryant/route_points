import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true

export function useInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed] = useState(isInstalled)
  const ios = isIos && !installed

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const prompt = async () => {
    if (!evt) return
    await evt.prompt()
    setEvt(null)
  }

  return { canInstall: !!evt, ios, installed, prompt }
}
