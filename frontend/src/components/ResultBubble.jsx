import { useState, useRef } from 'react'

const SEVERITY_CLASS = {
  high:     'severity-high',
  moderate: 'severity-moderate',
  none:     'severity-none',
  critical: 'severity-critical',
}

const SEVERITY_LABEL = {
  high:     '🔴 High Risk',
  moderate: '🟡 Moderate Risk',
  none:     '🟢 Healthy',
  critical: '🚨 Critical Outbreak',
}

export default function ResultBubble({ result }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)
  const { diagnosis, zone, advisory } = result

  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'
  const audioUrl = advisory.audio_url ? `${apiBase}${advisory.audio_url}` : null

  function toggleAudio() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const isHealthy    = diagnosis.is_healthy
  const severity     = isHealthy ? 'none' : (diagnosis.disease?.toLowerCase().includes('blight') ? 'high' : 'moderate')
  const bubbleClass  = isHealthy ? 'healthy' : 'disease'

  return (
    <div className="sms-panel">
      {/* Bubble 1: Diagnosis */}
      <div className={`sms-bubble ${bubbleClass}`}>
        <div className="sms-header">
          <span className="sms-tag">🌿 Diagnostic Results</span>
          <span className="confidence-pill" style={{ textShadow: 'none' }}>
            {Math.round(diagnosis.confidence * 100)}% Confidence
          </span>
        </div>

        <div className="diagnosis-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            {diagnosis.crop} —{' '}
            <span className={isHealthy ? 'healthy-name' : 'disease-name'}>
              {diagnosis.disease}
            </span>
          </div>
          <div>
            <span className={`severity-badge ${SEVERITY_CLASS[severity]}`}>
              {SEVERITY_LABEL[severity]}
            </span>
          </div>
        </div>

        <div className="divider" style={{ margin: '16px 0' }} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          📍 Pincode {diagnosis.pincode} · Diagnostic ID #{diagnosis.id}
        </div>
      </div>

      {/* Bubble 2: Zone & Crop Recommendation */}
      {zone && (
        <div className="sms-bubble" style={{ animationDelay: '0.1s' }}>
          <div className="sms-header">
            <span className="sms-tag">🗺️ Zone Agro-Climatic Intelligence</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: 'var(--text-primary)' }}>
            {zone.zone}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            📍 {zone.district}, {zone.state} · 🪵 {zone.soil_type} · 🌧️ {zone.rainfall_mm}mm rainfall
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recommended Resilient Crops (AIKosh data):
          </div>
          <div className="zone-chips">
            {zone.suitable_crops?.map((cropName, i) => (
              <span key={i} className={`zone-chip ${i < 2 ? 'highlight' : ''}`}>
                {cropName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bubble 3: Advisory */}
      {advisory && (
        <div className="sms-bubble" style={{ animationDelay: '0.2s' }}>
          <div className="sms-header" style={{ alignItems: 'center' }}>
            <span className="sms-tag">
              💬 Expert Advisory{advisory.translated ? ` · ${result.language}` : ''}
            </span>
            {audioUrl && (
              <button 
                className="btn btn-audio" 
                onClick={toggleAudio} 
                id="play-audio-btn"
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                {playing ? '⏸ Pause Advisory' : '🔊 Play Audio'}
              </button>
            )}
          </div>

          <div className="advisory-text" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, color: 'var(--text-primary)' }}>
            {advisory.advisory_text}
          </div>

          {advisory.translated && (
            <>
              <div className="divider" style={{ margin: '16px 0' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                📖 <strong>English Reference:</strong> {advisory.advisory_english}
              </div>
            </>
          )}

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              onError={() => setPlaying(false)}
            />
          )}

          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            Generated via Gemini 1.5 Flash · Speech translation via Bhashini voice synthesis
          </div>
        </div>
      )}
    </div>
  )
}
