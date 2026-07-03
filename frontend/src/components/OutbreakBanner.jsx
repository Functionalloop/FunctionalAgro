import { useState } from 'react'

export default function OutbreakBanner({ outbreak }) {
  const [dismissed, setDismissed] = useState(false)

  if (!outbreak?.outbreak || dismissed) return null

  return (
    <div className="outbreak-banner" id="outbreak-banner">
      <div className="outbreak-icon">🚨</div>
      <div style={{ flex: 1 }}>
        <div className="outbreak-title">
          OUTBREAK ALERT — {outbreak.crop} {outbreak.disease}
        </div>
        <div className="outbreak-text">
          {outbreak.count} cases detected near pincode <strong>{outbreak.pincode}</strong> in the
          last {outbreak.window_days} days. Advise neighbouring farmers to inspect their crops immediately.
        </div>
      </div>
      <button 
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', color: 'var(--red-400)',
          fontSize: 18, cursor: 'pointer', padding: 4, alignSelf: 'flex-start',
          opacity: 0.7, transition: 'opacity 0.2s', lineHeight: 1, marginTop: '-4px'
        }}
        onMouseEnter={e => e.target.style.opacity = 1}
        onMouseLeave={e => e.target.style.opacity = 0.7}
        aria-label="Close alert"
      >
        ✕
      </button>
    </div>
  )
}
