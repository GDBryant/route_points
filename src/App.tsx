import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MapView from '@/features/map/MapView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView />} />
      </Routes>
    </BrowserRouter>
  )
}
