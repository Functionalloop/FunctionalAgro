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
        <div className="bid-trader">
          {bid.trader} {isBest && '🏆'}
        </div>
        <div className="bid-message">{bid.message}</div>
        <div className="bid-amount">
          ₹{bid.bid.toLocaleString('en-IN')}
          <span> /quintal · Total: ₹{bid.total_value?.toLocaleString('en-IN')}</span>
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
    <div className="card">
      <div className="card-title">
        <span>🤝</span> AI Dalal — Price Negotiation
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        3 AI traders will bid on your crop using live Agmarknet price data.
        The best net price recommendation is shown at the end.
      </div>

      {/* Config */}
      <div className="form-row" style={{ marginTop: 0 }}>
        <div className="form-group">
          <label>🌾 Crop</label>
          <select className="form-select" value={crop} onChange={e => setCrop(e.target.value)}>
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>⚖️ Quantity (quintals)</label>
          <input
            className="form-input"
            type="number"
            min={1} max={1000}
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr auto' }}>
        <div className="form-group">
          <label>📍 Pincode</label>
          <input
            className="form-input"
            value={pincode}
            onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        <div className="form-group" style={{ alignSelf: 'flex-end' }}>
          <label>&nbsp;</label>
          <button
            className="btn btn-primary"
            onClick={negotiate}
            disabled={loading}
            style={{ marginTop: 0 }}
            id="dalal-negotiate-btn"
          >
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Getting bids…</>
              : <><span>🏷️</span> Get Best Price</>
            }
          </button>
        </div>
      </div>

      {loading && (
        <div className="loader">
          <div className="spinner" />
          Calling 3 AI traders… this takes ~10 seconds
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 16, padding: '12px 16px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)', color: 'var(--red-400)', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="dalal-panel">
          <div className="divider" />

          {/* Market reference */}
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            📊 Agmarknet modal price: <strong style={{ color: 'var(--text-secondary)' }}>
              ₹{result.market_modal_price?.toLocaleString('en-IN')}/quintal
            </strong>
          </div>

          {/* Outbreak warning */}
          {result.outbreak_warning && (
            <div style={{
              padding: '12px 16px', marginBottom: 16,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--red-400)',
            }}>
              {result.outbreak_warning}
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
            <h3>🏆 Best Deal</h3>
            <div className="best-deal-price">
              ₹{result.best_bid?.toLocaleString('en-IN')}<span style={{ fontSize: 20, color: 'var(--green-300)' }}>/quintal</span>
            </div>
            <div className="best-deal-meta">
              from <strong>{result.best_trader}</strong> ·
              Total: <strong>₹{result.best_total_value?.toLocaleString('en-IN')}</strong> for {result.qty_quintal} quintals
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
