import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import axios from 'axios'
import 'leaflet/dist/leaflet.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Fix marker icon paths in Vite
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function FitBounds({ hotspots }) {
  const map = useMap()
  useEffect(() => {
    if (hotspots.length > 0) {
      const bounds = hotspots.map(h => [h.lat, h.lng])
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [hotspots, map])
  return null
}

function markerColor(hotspot) {
  if (hotspot.outbreak) return '#ef4444'        // red
  if (hotspot.count >= 2) return '#f59e0b'      // amber
  return '#22c55e'                              // green
}

export default function MapPanel() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  async function fetchData() {
    setLoading(true)
    try {
      const { data: res } = await axios.get(`${API}/outbreak-map`)
      setData(res)
    } catch {
      setError('Could not load outbreak map. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const hotspots = data?.hotspots || []
  const outbreaks = hotspots.filter(h => h.outbreak)
  const total = hotspots.reduce((s, h) => s + h.count, 0)

  return (
    <div className="map-panel">

      {/* Stats */}
      <div className="map-stats">
        <div className="map-stat-card outbreak-stat">
          <div className="map-stat-number">{outbreaks.length}</div>
          <div className="map-stat-label">Active Outbreaks</div>
        </div>
        <div className="map-stat-card">
          <div className="map-stat-number">{hotspots.length}</div>
          <div className="map-stat-label">Affected Zones</div>
        </div>
        <div className="map-stat-card">
          <div className="map-stat-number">{total}</div>
          <div className="map-stat-label">Total Reports (7d)</div>
        </div>
      </div>

      {loading && (
        <div className="loader"><div className="spinner" /> Loading outbreak map…</div>
      )}

      {error && (
        <div style={{ padding: 16, color: 'var(--red-400)', fontSize: 13 }}>⚠️ {error}</div>
      )}

      {/* Map */}
      {!loading && !error && (
        <div className="map-container">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hotspots.map((h, i) => (
              <CircleMarker
                key={i}
                center={[h.lat, h.lng]}
                radius={Math.min(8 + h.count * 3, 28)}
                pathOptions={{
                  fillColor: markerColor(h),
                  color: markerColor(h),
                  fillOpacity: 0.7,
                  weight: h.outbreak ? 2 : 1,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160 }}>
                    <strong style={{ color: h.outbreak ? '#ef4444' : '#22c55e' }}>
                      {h.outbreak ? '🚨 OUTBREAK' : '⚠️ Disease Reports'}
                    </strong>
                    <br />
                    <strong>{h.crop} — {h.disease}</strong>
                    <br />
                    {h.district}, {h.state}
                    <br />
                    <span style={{ color: '#6b7280' }}>Pincode: {h.pincode}</span>
                    <br />
                    <strong>{h.count}</strong> cases in 7 days
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            <FitBounds hotspots={hotspots} />
          </MapContainer>
        </div>
      )}

      {/* Hotspot List */}
      {hotspots.length > 0 && (
        <div className="card">
          <div className="card-title">📋 All Reported Hotspots</div>
          <div className="hotspot-list">
            {hotspots.map((h, i) => (
              <div
                key={i}
                className={`hotspot-row ${h.outbreak ? 'outbreak' : h.count >= 2 ? 'warning' : ''}`}
              >
                <div className={`hotspot-dot ${h.outbreak ? 'red' : h.count >= 2 ? 'amber' : 'green'}`} />
                <div className="hotspot-info">
                  <div className="hotspot-title">{h.crop} — {h.disease}</div>
                  <div className="hotspot-sub">{h.district}, {h.state} · Pincode {h.pincode}</div>
                </div>
                <div className="hotspot-count">{h.count}×</div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
            onClick={fetchData}
            id="refresh-map-btn"
          >
            🔄 Refresh Map
          </button>
        </div>
      )}

      {hotspots.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌾</div>
          <div style={{ color: 'var(--text-secondary)' }}>No disease reports in the last 7 days.</div>
          <div className="text-muted" style={{ marginTop: 8 }}>
            Submit a crop diagnosis to start tracking outbreaks.
          </div>
        </div>
      )}
    </div>
  )
}
