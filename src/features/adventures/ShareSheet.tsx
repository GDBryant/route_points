import { shareUrl } from './api'

export default function ShareSheet({
  token,
  name,
  onClose,
}: {
  token: string
  name: string
  onClose: () => void
}) {
  const url = shareUrl(token)
  const text = `Join my adventure "${name}" on Route Points`

  const canShare = typeof navigator.share === 'function'

  const share = async () => {
    await navigator.share({ title: name, text, url }).catch(() => {})
    onClose()
  }

  const copy = async () => {
    await navigator.clipboard.writeText(`${text} ${url}`)
    onClose()
  }

  return (
    <div className="sheet" role="dialog">
      <h3>Share {name}</h3>
      <div className="stack">
        {canShare && (
          <button className="primary" onClick={share}>
            Share…
          </button>
        )}
        <a
          className="button"
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
        <button onClick={copy}>Copy link</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
