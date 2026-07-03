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
  return '#39ff14'                              // glowing green
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
        <div className="map-stat-card outbreak-stat" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div className="map-stat-number" style={{ textShadow: '0 0 10px rgba(239, 68, 68, 0.3)' }}>{outbreaks.length}</div>
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
        <div className="loader" style={{ padding: 40, gap: 10 }}>
          <div className="spinner" />
          <div style={{ color: 'var(--green-400)', fontWeight: 600 }}>Loading Outbreak Map Data…</div>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: 16, 
          color: 'var(--red-400)', 
          background: 'rgba(239,68,68,0.1)', 
          border: '1px solid rgba(239,68,68,0.25)', 
          borderRadius: 'var(--radius-sm)',
          fontSize: 13 
        }}>
          ⚠️ {error}
        </div>
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
                radius={Math.min(8 + h.count * 3.5, 26)}
                pathOptions={{
                  fillColor: markerColor(h),
                  color: markerColor(h),
                  fillOpacity: 0.7,
                  weight: h.outbreak ? 2.5 : 1,
                  dashArray: h.outbreak ? '4,4' : null,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'Outfit, Inter, sans-serif', minWidth: 170, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>
                    <strong style={{ color: h.outbreak ? '#ef4444' : '#39ff14', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {h.outbreak ? '🚨 CRITICAL OUTBREAK' : '⚠️ ACTIVE REPORT'}
                    </strong>
                    <div style={{ fontWeight: 800, fontSize: 14, margin: '4px 0' }}>
                      {h.crop} — {h.disease}
                    </div>
                    <div>📍 {h.district}, {h.state}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Pincode Zone: {h.pincode}</div>
                    <div className="divider" style={{ margin: '8px 0' }} />
                    <strong style={{ color: 'var(--green-400)' }}>{h.count}</strong> farmer reports in 7d
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
        <div className="glass-panel" style={{ marginTop: 8, background: 'rgba(4, 20, 14, 0.35)' }}>
          <div className="card-title" style={{ fontSize: 18, color: 'var(--green-500)', marginBottom: 20 }}>
            📋 Reported Hotspot Feed
          </div>
          <div className="hotspot-list">
            {hotspots.map((h, i) => (
              <div
                key={i}
                className={`hotspot-row ${h.outbreak ? 'outbreak' : h.count >= 2 ? 'warning' : ''}`}
                style={{ animationDelay: `${i * 0.1}s`, animation: 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}
              >
                <div className={`hotspot-dot ${h.outbreak ? 'red' : h.count >= 2 ? 'amber' : 'green'}`} />
                <div className="hotspot-info">
                  <div className="hotspot-title">{h.crop} — {h.disease}</div>
                  <div className="hotspot-sub">{h.district}, {h.state} · Zone Pincode {h.pincode}</div>
                </div>
                <div className="hotspot-count" style={{ color: h.outbreak ? 'var(--red-400)' : 'var(--green-500)' }}>
                  {h.count}×
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
            onClick={fetchData}
            id="refresh-map-btn"
          >
            🔄 Refresh Outbreak Data
          </button>
        </div>
      )}

      {hotspots.length === 0 && !loading && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🌾</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>No Active Disease Hotspots</div>
          <div className="text-muted" style={{ marginTop: 6 }}>
            No outbreaks detected in the last 7 days. Once diagnostics are registered, regions will pop up here.
          </div>
        </div>
      )}
    </div>
  )
}
