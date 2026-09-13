import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { API } from '../api'


const CROPS = [
  { name: 'Wheat',     emoji: '🌾', hasMsp: true  },
  { name: 'Rice',      emoji: '🍚', hasMsp: true  },
  { name: 'Maize',     emoji: '🌽', hasMsp: true  },
  { name: 'Cotton',    emoji: '☁️', hasMsp: true  },
  { name: 'Soybean',   emoji: '🫘', hasMsp: true  },
  { name: 'Groundnut', emoji: '🥜', hasMsp: true  },
  { name: 'Tomato',    emoji: '🍅', hasMsp: false },
  { name: 'Potato',    emoji: '🥔', hasMsp: false },
  { name: 'Onion',     emoji: '🧅', hasMsp: false },
  { name: 'Chilli',    emoji: '🌶️', hasMsp: false },
]

// ── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '₹', duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  const start = useRef(0)
  const raf   = useRef(null)

  useEffect(() => {
    const target = Number(value) || 0
    const begin  = Date.now()
    const startVal = start.current

    const tick = () => {
      const elapsed  = Date.now() - begin
      const progress = Math.min(elapsed / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)  // ease-out cubic
      setDisplay(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
      else start.current = target
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  return <span>{prefix}{display.toLocaleString('en-IN')}</span>
}

// ── CSS Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ channels, maxValue }) {
  const palette = {
    dalal:  { bar: 'linear-gradient(160deg,#22d3ee,#6366f1)', label: '#22d3ee', glow: 'rgba(34,211,238,0.35)'  },
    msp:    { bar: 'linear-gradient(160deg,#f59e0b,#d97706)', label: '#f59e0b', glow: 'rgba(245,158,11,0.35)'  },
    market: { bar: 'linear-gradient(160deg,#4ade80,#16a34a)', label: '#4ade80', glow: 'rgba(74,222,128,0.35)'  },
  }
  const ORDER = ['dalal', 'msp', 'market']

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 210, padding: '0 8px' }}>
      {ORDER.filter(k => channels[k]).map(key => {
        const ch  = channels[key]
        const pct = maxValue > 0 ? Math.max(6, (ch.gross_revenue / maxValue) * 100) : 6
        const c   = palette[key]
        return (
          <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* Gross revenue label */}
            <div style={{ fontSize: 11, fontWeight: 700, color: c.label, textAlign: 'center' }}>
              ₹{ch.gross_revenue.toLocaleString('en-IN')}
            </div>
            {/* Bar */}
            <div style={{ width: '100%', height: 148, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${pct}%`,
                background: c.bar,
                borderRadius: '8px 8px 4px 4px',
                boxShadow: `0 0 20px ${c.glow}`,
                transition: 'height 1.3s cubic-bezier(0.34,1.56,0.64,1)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.12) 50%,transparent 60%)',
                  animation: 'shimmer 2.6s ease-in-out infinite',
                }} />
              </div>
            </div>
            {/* Net profit pill */}
            <div style={{
              fontSize: 10, fontWeight: 800, textAlign: 'center',
              color:       ch.net_profit >= 0 ? '#86efac' : '#fca5a5',
              background:  ch.net_profit >= 0 ? 'rgba(134,239,172,0.08)' : 'rgba(239,68,68,0.08)',
              border:     `1px solid ${ch.net_profit >= 0 ? 'rgba(134,239,172,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 6, padding: '3px 7px',
            }}>
              Net {ch.net_profit >= 0 ? '+' : ''}₹{Math.abs(ch.net_profit).toLocaleString('en-IN')}
            </div>
            {/* Channel label */}
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 600, lineHeight: 1.3 }}>
              {ch.emoji} {ch.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProfitCalc() {
  const [crop,          setCrop]          = useState('Wheat')
  const [areaAcres,     setAreaAcres]     = useState(2)
  const [yieldOverride, setYieldOverride] = useState('')
  const [pincode,       setPincode]       = useState('560001')
  const [result,        setResult]        = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  const selectedMeta = CROPS.find(c => c.name === crop) || CROPS[0]

  const handleCalculate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        crop,
        area_acres: Number(areaAcres),
        pincode,
        ...(yieldOverride ? { yield_per_acre: Number(yieldOverride) } : {}),
      }
      const { data } = await axios.post(`${API}/profit-calc`, payload)
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Calculation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const maxGross  = result ? Math.max(...Object.values(result.channels).map(c => c.gross_revenue)) : 0
  const bestKey   = result?.best_channel
  const bestCh    = result?.channels?.[bestKey]
  const CHANNEL_ORDER = ['dalal', 'msp', 'market']

  const borderColors = {
    msp:    'rgba(245,158,11,0.3)',
    dalal:  'rgba(34,211,238,0.3)',
    market: 'rgba(74,222,128,0.3)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>

      {/* ── Left panel: Controls ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            🧮 Profit Calculator
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Compare Government MSP vs AI Dalal vs open market. See which channel gives you the highest net profit.
          </p>
        </div>

        {/* Crop selector */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 10 }}>
            Crop
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CROPS.map(c => (
              <button
                key={c.name}
                onClick={() => { setCrop(c.name); setResult(null) }}
                style={{
                  padding: '5px 11px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                  background: crop === c.name ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.05)',
                  color:      crop === c.name ? '#c7d2fe' : 'var(--text-secondary)',
                  boxShadow:  crop === c.name ? '0 0 10px rgba(99,102,241,0.2)' : 'none',
                  outline:    crop === c.name ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {c.emoji} {c.name}
                {c.hasMsp && <span style={{ fontSize: 9, marginLeft: 4, color: '#fbbf24' }}>MSP</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Area slider */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
            Area — <span style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>{areaAcres} acre{areaAcres !== 1 ? 's' : ''}</span>
          </label>
          <input
            type="range" min={0.5} max={50} step={0.5}
            value={areaAcres}
            onChange={e => { setAreaAcres(Number(e.target.value)); setResult(null) }}
            style={{ width: '100%', accentColor: '#6366f1' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>0.5 ac</span><span>50 ac</span>
          </div>
        </div>

        {/* Yield override */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
            Yield/Acre <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(quintals — leave blank for default)</span>
          </label>
          <input
            type="number" placeholder="Leave blank for crop average"
            value={yieldOverride}
            onChange={e => { setYieldOverride(e.target.value); setResult(null) }}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 10, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)', fontSize: 13,
            }}
          />
        </div>

        {/* Pincode */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
            Pincode <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(for live market price)</span>
          </label>
          <input
            type="text" maxLength={6} placeholder="e.g. 560001"
            value={pincode}
            onChange={e => { setPincode(e.target.value); setResult(null) }}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 10, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)', fontSize: 13,
            }}
          />
        </div>

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          disabled={loading}
          id="profit-calc-btn"
          style={{
            padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: loading ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: 'white', fontSize: 14, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: loading ? 'none' : '0 4px 24px rgba(99,102,241,0.35)',
            transition: 'all 0.25s',
          }}
        >
          {loading
            ? <><div className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Calculating…</>
            : '🧮 Calculate Profit'
          }
        </button>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#fca5a5' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Data source note */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 'auto' }}>
          🏛️ MSP data: CACP India 2024-25 · Market: Agmarknet live prices
        </div>
      </div>

      {/* ── Right panel: Results ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!result ? (
          <div className="glass-panel" style={{
            textAlign: 'center', padding: '70px 30px', flex: 1,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          }}>
            <div style={{ fontSize: 56, marginBottom: 18, animation: 'float 3.5s ease-in-out infinite' }}>📊</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              MSP vs AI Dalal vs Market
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 300 }}>
              Pick your crop and area, then hit Calculate to see an animated bar chart comparing all three selling channels with net profit per acre.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
              <span className="badge">🏛️ Govt MSP</span>
              <span className="badge">💎 AI Dalal</span>
              <span className="badge">📊 Agmarknet</span>
              <span className="badge">⚡ Real-time</span>
            </div>
          </div>
        ) : (
          <>
            {/* Winner banner */}
            <div style={{
              borderRadius: 16, padding: '18px 22px',
              background: bestKey === 'dalal' ? 'rgba(34,211,238,0.06)' : bestKey === 'msp' ? 'rgba(245,158,11,0.06)' : 'rgba(74,222,128,0.06)',
              border:     bestKey === 'dalal' ? '1px solid rgba(34,211,238,0.25)' : bestKey === 'msp' ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(74,222,128,0.25)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ fontSize: 34 }}>{bestCh?.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                  Best option — {selectedMeta.emoji} {crop} · {areaAcres} acre{areaAcres !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{bestCh?.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  ₹{result.best_price_per_quintal.toLocaleString('en-IN')}/quintal · {result.total_yield_quintals} quintals total
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Net Profit</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#4ade80' }}>
                  <AnimatedNumber value={result.best_net_profit} />
                </div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="glass-panel" style={{ padding: '20px 20px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                📈 Gross Revenue Comparison — {result.total_yield_quintals} quintals
              </div>
              <BarChart channels={result.channels} maxValue={maxGross} />
              <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                Input cost: ₹{result.total_input_cost.toLocaleString('en-IN')} deducted · Yield: {result.yield_per_acre} q/acre
              </div>
            </div>

            {/* Per-channel cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CHANNEL_ORDER.filter(k => result.channels[k]).map(key => {
                const ch     = result.channels[key]
                const isBest = key === bestKey
                return (
                  <div key={key} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${borderColors[key]}`,
                    borderRadius: 12, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {isBest && (
                      <div style={{
                        position: 'absolute', top: 7, right: 12,
                        fontSize: 9, fontWeight: 800, color: '#fbbf24',
                        background: 'rgba(251,191,36,0.1)', padding: '2px 9px',
                        borderRadius: 20, border: '1px solid rgba(251,191,36,0.2)',
                      }}>⭐ BEST</div>
                    )}
                    <div style={{ fontSize: 24 }}>{ch.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ch.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        ₹{ch.price_per_quintal.toLocaleString('en-IN')}/quintal · ₹{ch.per_acre_gross.toLocaleString('en-IN')}/acre gross
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{ch.gross_revenue.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ch.net_profit >= 0 ? '#86efac' : '#fca5a5' }}>
                        Net {ch.net_profit >= 0 ? '+' : ''}₹{ch.net_profit.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recommendation box */}
            <div style={{
              padding: '14px 18px', borderRadius: 12,
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
            }}>
              💡 <strong style={{ color: 'var(--text-primary)' }}>Recommendation:</strong> {result.recommendation}
            </div>

            {/* MSP info */}
            {result.has_msp ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🏛️ MSP from CACP India — {result.msp_season} season
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.7)', display: 'flex', alignItems: 'center', gap: 6 }}>
                ℹ️ {crop} has no government MSP. Market &amp; AI Dalal channels only.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
