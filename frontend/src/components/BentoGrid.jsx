export default function BentoGrid({ onSelectTab }) {
  const features = [
    {
      id: 'diagnose',
      tag: 'AI Powered',
      tagClass: 'tag-green',
      title: 'Crop Disease Diagnosis',
      desc: 'Upload a photo of your plant leaf and our classifier identifies the disease from 38 categories — offline, on your device.',
      cta: 'Start scanning',
    },
    {
      id: 'dalal',
      tag: 'Live Prices',
      tagClass: 'tag-amber',
      title: 'Market Price Negotiation',
      desc: 'Three traders compete to buy your crop. Bids are anchored against live Agmarknet government wholesale prices.',
      cta: 'Get a price',
    },
    {
      id: 'radar',
      tag: 'Crowdsourced',
      tagClass: 'tag-red',
      title: 'Disease Outbreak Radar',
      desc: 'Anonymous disease reports build a real-time map. If too many cases cluster in your area, you get an early warning.',
      cta: 'View radar',
    },
  ]

  return (
    <div className="features-row" style={{ paddingTop: 40 }}>
      {features.map((f) => (
        <div
          key={f.id}
          className="feature-card"
          onClick={() => onSelectTab(f.id)}
          id={`feature-card-${f.id}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelectTab(f.id)}
        >
          <span className={`feature-card-tag ${f.tagClass}`}>{f.tag}</span>
          <h3 className="feature-card-title">{f.title}</h3>
          <p className="feature-card-desc">{f.desc}</p>
          <span className="feature-card-cta">{f.cta} →</span>
        </div>
      ))}
    </div>
  )
}
