export default function Hero({ onStartDiagnose, onStartDalal }) {
  return (
    <div className="hero">
      <div className="hero-content">
        <div className="hero-kicker">
          <span className="hero-kicker-dot" />
          Built on Government Infrastructure
        </div>
        <h1 className="hero-title">
          Better farming.<br />
          <em>Better prices.</em>
        </h1>
        <p className="hero-body">
          FunctionalAgro uses AIKosh, Bhashini, and Agmarknet — real government data —
          backed by Gemini AI to help you diagnose plant disease, track local outbreaks,
          and negotiate your crop price in 10+ Indian languages.
        </p>
        <div className="hero-actions">
          <button
            className="btn btn-primary"
            onClick={onStartDiagnose}
            id="hero-diagnose-cta"
          >
            📸 Scan a crop
          </button>
          <button
            className="btn btn-secondary"
            onClick={onStartDalal}
            id="hero-dalal-cta"
          >
            Get a price quote
          </button>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-visual-stat">
          <div className="hero-visual-icon icon-leaf">🌿</div>
          <div>
            <div className="hero-visual-label">Disease Classes</div>
            <div className="hero-visual-value">38</div>
            <div className="hero-visual-sub">Crop diseases detected on-device</div>
          </div>
        </div>
        <div className="hero-visual-stat">
          <div className="hero-visual-icon icon-chart">📊</div>
          <div>
            <div className="hero-visual-label">Live Prices</div>
            <div className="hero-visual-value">Agmarknet</div>
            <div className="hero-visual-sub">Real-time government mandi data</div>
          </div>
        </div>
        <div className="hero-visual-stat">
          <div className="hero-visual-icon icon-terra">🗣️</div>
          <div>
            <div className="hero-visual-label">Languages</div>
            <div className="hero-visual-value">10+</div>
            <div className="hero-visual-sub">Hindi, Tamil, Telugu, Kannada &amp; more</div>
          </div>
        </div>
        <div className="hero-visual-stat">
          <div className="hero-visual-icon icon-alert">🚨</div>
          <div>
            <div className="hero-visual-label">Outbreak Radar</div>
            <div className="hero-visual-value">Live</div>
            <div className="hero-visual-sub">Crowdsourced disease cluster alerts</div>
          </div>
        </div>
      </div>
    </div>
  )
}
