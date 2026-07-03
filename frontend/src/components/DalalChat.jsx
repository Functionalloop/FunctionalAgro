import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const CROPS = [
  'Tomato', 'Potato', 'Onion', 'Wheat', 'Rice',
  'Maize', 'Cotton', 'Soybean', 'Chilli', 'Groundnut',
]

// ── Live Price Badge ─────────────────────────────────────────────────────────
function LivePriceBadge({ data }) {
  if (!data) return null
  const isLive = data.source?.includes('live')
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: isLive ? 'rgba(37,211,102,0.12)' : 'rgba(255,193,7,0.12)',
      border: `1px solid ${isLive ? 'rgba(37,211,102,0.35)' : 'rgba(255,193,7,0.35)'}`,
      color: isLive ? '#16a34a' : '#b45309',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isLive ? '#25D366' : '#f59e0b',
        display: 'inline-block',
        animation: isLive ? 'pulseDot 1.5s ease-in-out infinite' : 'none',
      }} />
      {isLive ? 'Live · Agmarknet' : 'Cached Data'}
    </div>
  )
}

// ── Market Price Card ─────────────────────────────────────────────────────────
function MarketPriceCard({ crop, pincode, onPriceLoaded }) {
  const [price, setPrice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    axios.get(`${API}/live-prices`, { params: { commodity: crop, pincode } })
      .then(({ data }) => {
        setPrice(data)
        onPriceLoaded?.(data.modal_price)
      })
      .catch(() => setError('Price unavailable'))
      .finally(() => setLoading(false))
  }, [crop, pincode])

  if (loading) return (
    <div className="market-price-card loading">
      <div className="spinner" style={{ width: 16, height: 16 }} />
      <span>Fetching {crop} price…</span>
    </div>
  )

  if (error) return (
    <div className="market-price-card error">⚠️ {error}</div>
  )

  if (!price) return null

  return (
    <div className="market-price-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          📊 Market Reference — {price.state}
        </div>
        <LivePriceBadge data={{ source: price.source }} />
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Min</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            ₹{price.min_price?.toLocaleString('en-IN')}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Modal (Market Price)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-400)', lineHeight: 1 }}>
            ₹{price.modal_price?.toLocaleString('en-IN')}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>/q</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Max</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            ₹{price.max_price?.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
        📅 {price.date} · {price.data_attribution}
      </div>
    </div>
  )
}

// ── Bid Card ─────────────────────────────────────────────────────────────────
function BidCard({ bid, index, isBest }) {
  return (
    <div
      className={`bid-card ${isBest ? 'best' : ''}`}
      style={{ animationDelay: `${index * 0.18}s` }}
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

// ── All Prices Table ─────────────────────────────────────────────────────────
function AllPricesPanel({ pincode }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  function load() {
    if (data) { setOpen(o => !o); return }
    setLoading(true)
    axios.get(`${API}/live-prices`, { params: { pincode } })
      .then(({ data: d }) => { setData(d); setOpen(true) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={load}
        style={{
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
          fontSize: 12, color: 'var(--text-muted)', display: 'flex',
          alignItems: 'center', gap: 6,
        }}
      >
        {loading ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Loading…</> : `📊 ${open ? 'Hide' : 'View all'} market prices`}
      </button>

      {open && data && (
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Crop</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Min</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', color: '#16a34a', fontWeight: 700 }}>Modal</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Max</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.prices || {}).map(([crop, p]) => (
                <tr key={crop} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 500 }}>{crop}</td>
                  <td style={{ textAlign: 'right', padding: '7px 10px', color: 'var(--text-muted)' }}>₹{p.min?.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 700, color: '#16a34a' }}>₹{p.modal?.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', padding: '7px 10px', color: 'var(--text-muted)' }}>₹{p.max?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            📅 Last updated: {data.last_updated} · {data.data_attribution}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main DalalChat ───────────────────────────────────────────────────────────
export default function DalalChat({ diagnosisResult }) {
  const [crop, setCrop]       = useState(diagnosisResult?.diagnosis?.crop || 'Tomato')
  const [qty, setQty]         = useState(10)
  const [pincode, setPincode] = useState(diagnosisResult?.diagnosis?.pincode || '560001')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [modalPrice, setModalPrice] = useState(null)

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
      setError(err.response?.data?.detail || 'Negotiation failed. Is the backend running?')
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
        3 AI traders bid on your crop using <strong>live Agmarknet</strong> price data pulled directly from the Government of India market portal.
      </div>

      {/* Config row */}
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
            type="number" min={1} max={1000}
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

      {/* Live market price reference */}
      {crop && pincode.length === 6 && (
        <MarketPriceCard
          crop={crop}
          pincode={pincode}
          onPriceLoaded={setModalPrice}
        />
      )}

      {/* All prices table toggle */}
      {pincode.length === 6 && <AllPricesPanel pincode={pincode} />}

      {loading && (
        <div className="loader">
          <div className="spinner" />
          Calling 3 AI traders… (~10 seconds)
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

          {/* Market reference from backend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            <span>📊 Market modal price:</span>
            <strong style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              ₹{result.market_modal_price?.toLocaleString('en-IN')}/q
            </strong>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
              color: '#16a34a', fontWeight: 600,
            }}>
              🟢 Agmarknet Live
            </span>
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

          {/* Best deal */}
          <div className="best-deal-card" id="best-deal-card">
            <h3>🏆 Best Deal</h3>
            <div className="best-deal-price">
              ₹{result.best_bid?.toLocaleString('en-IN')}
              <span style={{ fontSize: 20, color: 'var(--green-300)' }}>/quintal</span>
            </div>
            <div className="best-deal-meta">
              from <strong>{result.best_trader}</strong> ·
              Total: <strong>₹{result.best_total_value?.toLocaleString('en-IN')}</strong> for {result.qty_quintal} quintals
            </div>
            {modalPrice && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                {result.best_bid > modalPrice
                  ? `✅ ${Math.round((result.best_bid / modalPrice - 1) * 100)}% above today's market price`
                  : `⚠️ ${Math.round((1 - result.best_bid / modalPrice) * 100)}% below today's market price`}
              </div>
            )}
            <div className="best-deal-recommendation">
              💡 {result.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
