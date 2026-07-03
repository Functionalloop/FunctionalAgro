export default function Hero({ onStartDiagnose, onStartDalal }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-pill">
          <span>🌱</span> Next-Gen Smart Farming
        </div>
        <h2 className="hero-title">
          Cool Farming.<br />
          Smart Yield.<br />
          Best Price.
        </h2>
        <p className="hero-subtitle">
          FunctionalAgro uses real government infrastructure (AIKosh, Bhashini, and Agmarknet) 
          backed by Google Gemini to help you diagnose plant diseases instantly, track local 
          outbreaks in real time, and negotiate crop prices with AI buyers.
        </p>

        <div className="hero-ctas">
          <button 
            className="btn btn-primary" 
            onClick={onStartDiagnose}
            id="hero-diagnose-cta"
          >
            📸 Diagnose Crop
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onStartDalal}
            id="hero-dalal-cta"
          >
            🤝 Get Best Price
          </button>
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <div className="hero-stat-val">38</div>
            <div className="hero-stat-lbl">Disease Classes</div>
          </div>
          <div className="hero-stat-card">
            <div className="hero-stat-val">10+</div>
            <div className="hero-stat-lbl">Indian Languages</div>
          </div>
          <div className="hero-stat-card">
            <div className="hero-stat-val">Live</div>
            <div className="hero-stat-lbl">Agmarknet Anchors</div>
          </div>
        </div>
      </div>
      <div className="hero-3d-placeholder" style={{ pointerEvents: 'none' }} />
    </section>
  )
}
