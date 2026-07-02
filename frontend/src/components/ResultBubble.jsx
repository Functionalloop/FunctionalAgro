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
  critical: '🚨 Critical',
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
          <span className="sms-tag">🌿 Diagnosis Result</span>
          <span className="confidence-pill">{Math.round(diagnosis.confidence * 100)}% confidence</span>
        </div>

        <div className="diagnosis-line">
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

        <div className="divider" />
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          📍 Pincode {diagnosis.pincode} · ID #{diagnosis.id}
        </div>
      </div>

      {/* Bubble 2: Zone & Crop Recommendation */}
      {zone && (
        <div className="sms-bubble" style={{ animationDelay: '0.1s' }}>
          <div className="sms-header">
            <span className="sms-tag">🗺️ Zone &amp; Crop Recommendation</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            {zone.zone}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            {zone.district}, {zone.state} · {zone.soil_type} · {zone.rainfall_mm} mm rainfall
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Suitable crops for your region (AIKosh data):
          </div>
          <div className="zone-chips">
            {zone.suitable_crops?.map((crop, i) => (
              <span key={i} className={`zone-chip ${i < 2 ? 'highlight' : ''}`}>{crop}</span>
            ))}
          </div>
        </div>
      )}

      {/* Bubble 3: Advisory */}
      {advisory && (
        <div className="sms-bubble" style={{ animationDelay: '0.2s' }}>
          <div className="sms-header">
            <span className="sms-tag">
              💬 Advisory{advisory.translated ? ` · ${result.language}` : ''}
            </span>
            {audioUrl && (
              <button className="btn btn-audio" onClick={toggleAudio} id="play-audio-btn">
                {playing ? '⏸️ Pause' : '🔊 Play Audio'}
              </button>
            )}
          </div>

          <div className="advisory-text">{advisory.advisory_text}</div>

          {advisory.translated && (
            <>
              <div className="divider" />
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                📖 English: {advisory.advisory_english}
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

          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            Powered by Gemini 1.5 Flash · Translated via Bhashini
          </div>
        </div>
      )}
    </div>
  )
}
