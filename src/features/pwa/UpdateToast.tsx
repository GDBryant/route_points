import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export default function UpdateToast() {
  const [need, setNeed] = useState(false)
  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeed(true)
      },
    })
    void update
  }, [])
  if (!need) return null
  return (
    <div className="toast">
      Update available —
      <button onClick={() => location.reload()}>Reload</button>
    </div>
  )
}
