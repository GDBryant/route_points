import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { memberIcon } from './memberIcon'
import type { LivePos } from './usePositions'

export default function MemberMarker({ pos }: { pos: LivePos }) {
  const icon = useMemo(() => memberIcon(pos), [pos])
  return <Marker position={[pos.lat, pos.lng]} icon={icon} interactive={false} />
}
