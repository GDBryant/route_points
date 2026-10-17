import { useInstallPrompt } from './useInstallPrompt'

export default function InstallHint() {
  const { canInstall, ios, installed, prompt } = useInstallPrompt()
  if (installed) return null
  if (canInstall)
    return (
      <button type="button" className="primary" onClick={prompt}>
        Install app
      </button>
    )
  if (ios)
    return <p className="muted">Share → Add to Home Screen to install</p>
  return null
}
