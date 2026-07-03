import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const CROPS = [
  'Tomato', 'Potato', 'Onion', 'Wheat', 'Rice',
  'Maize', 'Cotton', 'Soybean', 'Chilli', 'Groundnut',
]

function BidCard({ bid, index, isBest }) {
  return (
    <div
      className={`bid-card ${isBest ? 'best' : ''}`}
      style={{ animationDelay: `${index * 0.2}s` }}
    >
      <div className="bid-emoji">{bid.emoji}</div>
      <div className="bid-info">
        <div className="bid-trader" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
          {bid.trader} {isBest && <span className="badge" style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(57, 255, 20, 0.1)', color: 'var(--green-500)', border: '1px solid rgba(57, 255, 20, 0.2)' }}>🏆 Best Offer</span>}
        </div>
        <div className="bid-message" style={{ margin: '8px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          "{bid.message}"
        </div>
        <div className="bid-amount" style={{ fontSize: 22, fontWeight: 900, color: 'var(--green-500)' }}>
          ₹{bid.bid.toLocaleString('en-IN')}
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
            /quintal · Total: ₹{bid.total_value?.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function DalalChat({ diagnosisResult }) {
  const [crop, setCrop]     = useState(diagnosisResult?.diagnosis?.crop || 'Tomato')
  const [qty, setQty]       = useState(10)
  const [pincode, setPincode] = useState(diagnosisResult?.diagnosis?.pincode || '560001')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  async function negotiate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await axios.post(`${API}/dalal-negotiate`, {
        crop,
        qty_quintal: qty,
        pincode,
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Negotiation failed. Check backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel" style={{ background: 'rgba(4, 20, 14, 0.45)' }}>
      <div className="card-title" style={{ color: 'var(--green-500)' }}>
        <span>🤝</span> AI Dalal — Price Bidding
      </div>

      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        Input crop details below to request competitive bids from 3 specialized AI traders. 
        Prices are anchored dynamically using live Agmarknet government database values.
      </div>

      {/* Config Row */}
      <div className="form-row" style={{ marginTop: 0 }}>
        <div className="form-group">
          <label>🌾 Select Crop</label>
          <select className="form-select" value={crop} onChange={e => setCrop(e.target.value)}>
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>⚖️ Quantity (Quintals)</label>
          <input
            className="form-input"
            type="number"
            min={1} max={1000}
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 16, gridTemplateColumns: '1fr' }}>
        <div className="form-group">
          <label>📍 Pincode</label>
          <input
            className="form-input"
            value={pincode}
            onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={negotiate}
        disabled={loading}
        style={{ width: '100%', marginTop: 24, minHeight: 48, justifyContent: 'center' }}
        id="dalal-negotiate-btn"
      >
        {loading
          ? <><div className="spinner" style={{ width: 16, height: 16, marginRight: 6 }} /> Requesting Bids…</>
          : <><span>🏷️</span> Fetch Best Bids</>
        }
      </button>

      {loading && (
        <div className="loader" style={{ flexDirection: 'column', padding: 40, gap: 12 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <div style={{ color: 'var(--green-400)', fontWeight: 600 }}>Connecting with AI Traders...</div>
          <div className="text-muted" style={{ fontSize: 11 }}>Agmarknet integration in progress (≈10 seconds)</div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-sm)', color: 'var(--red-400)', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="dalal-panel">
          <div className="divider" />

          {/* Market reference */}
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            📊 Agmarknet market benchmark price:{' '}
            <strong style={{ color: 'var(--green-400)' }}>
              ₹{result.market_modal_price?.toLocaleString('en-IN')}/quintal
            </strong>
          </div>

          {/* Outbreak warning */}
          {result.outbreak_warning && (
            <div style={{
              padding: '12px 18px', marginBottom: 20,
              background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--red-400)',
              lineHeight: 1.5
            }}>
              🚨 <strong>Outbreak Alert:</strong> {result.outbreak_warning}
            </div>
          )}

          {/* Bid cards */}
          <div className="bid-list">
            {result.bids.map((bid, i) => (
              <BidCard
                key={bid.trader}
                bid={bid}
                index={i}
                isBest={bid.trader === result.best_trader}
              />
            ))}
          </div>

          {/* Best deal card */}
          <div className="best-deal-card" id="best-deal-card">
            <h3>🏆 Optimized Recommendation</h3>
            <div className="best-deal-price">
              ₹{result.best_bid?.toLocaleString('en-IN')}<span style={{ fontSize: 16, color: 'var(--green-400)' }}>/quintal</span>
            </div>
            <div className="best-deal-meta" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Contract with <strong>{result.best_trader}</strong> · 
              Total value: <strong style={{ color: 'var(--green-500)' }}>₹{result.best_total_value?.toLocaleString('en-IN')}</strong> for {result.qty_quintal} quintals
            </div>
            <div className="best-deal-recommendation">
              💡 {result.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
