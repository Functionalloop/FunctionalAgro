import { useState } from 'react'

export default function OutbreakBanner({ outbreak }) {
  const [dismissed, setDismissed] = useState(false)

  if (!outbreak?.outbreak || dismissed) return null

  return (
    <div className="outbreak-banner" id="outbreak-banner">
      <span style={{ fontSize: 22, flexShrink: 0 }}>🚨</span>
      <div style={{ flex: 1 }}>
        <div className="outbreak-title">
          Disease outbreak — {outbreak.crop} {outbreak.disease}
        </div>
        <div className="outbreak-text">
          {outbreak.count} cases near pincode <strong>{outbreak.pincode}</strong> in the last {outbreak.window_days} days.
          Alert neighbouring farmers to inspect immediately.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', color: 'var(--alert)',
          fontSize: 18, cursor: 'pointer', padding: 4, alignSelf: 'flex-start',
          lineHeight: 1, opacity: 0.6
        }}
        aria-label="Close alert"
      >
        ✕
      </button>
    </div>
  )
}

