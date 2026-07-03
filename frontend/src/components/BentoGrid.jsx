export default function BentoGrid({ onSelectTab }) {
  const features = [
    {
      id: 'diagnose',
      title: 'Crop Diagnosis',
      desc: 'Upload a picture of your plant to instantly scan and diagnose over 38 disease categories with detailed recommendations.',
      emoji: '🌿',
      subEmoji: '🔍',
      clayClass: 'clay-diagnose',
      actionText: 'Open Diagnosis Cabin →',
    },
    {
      id: 'dalal',
      title: 'Market Dalal',
      desc: 'Negotiate the best price for your crops with 3 competitive traders anchored against real-time government Agmarknet prices.',
      emoji: '📈',
      subEmoji: '💰',
      clayClass: 'clay-dalal',
      actionText: 'Start Price Bidding →',
    },
    {
      id: 'radar',
      title: 'Outbreak Radar',
      desc: 'Anonymous crowdsourced disease tracking map. Receive instant alerts if too many plant problems are detected in your area.',
      emoji: '🚨',
      subEmoji: '🗺️',
      clayClass: 'clay-radar',
      actionText: 'View Radar Map →',
    },
  ]

  return (
    <section className="bento-section">
      <h3 className="bento-title">Our Intelligent Ecosystem</h3>
      <div className="bento-grid">
        {features.map((f) => (
          <div 
            key={f.id} 
            className={`glass-panel bento-card ${f.id === 'radar' ? 'radar-card' : ''}`}
            onClick={() => onSelectTab(f.id)}
            id={`bento-card-${f.id}`}
          >
            <div>
              <div className="bento-icon-wrapper">
                <div className={`clay-3d ${f.clayClass}`}>
                  {f.emoji}
                </div>
                <div className="floating-sub">
                  {f.subEmoji}
                </div>
              </div>

              <div className="bento-info">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>

            <div className="bento-action">
              {f.actionText}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
