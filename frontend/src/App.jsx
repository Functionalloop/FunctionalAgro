import { useState } from 'react'
import DiagnosePanel  from './components/DiagnosePanel'
import ResultBubble   from './components/ResultBubble'
import OutbreakBanner from './components/OutbreakBanner'
import DalalChat      from './components/DalalChat'
import MapPanel       from './components/MapPanel'

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export default function App() {
  const [activeTab, setActiveTab]   = useState('diagnose')
  const [result, setResult]         = useState(null)
  const [outbreak, setOutbreak]     = useState(null)

  const tabs = [
    { id: 'diagnose', label: 'Diagnose',        emoji: '🔬' },
    { id: 'dalal',    label: 'AI Dalal',         emoji: '🤝' },
    { id: 'radar',    label: 'Outbreak Radar',   emoji: '🚨' },
  ]

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="brand-icon">🌾</div>
          <div className="brand-text">
            <h1>FunctionalAgro</h1>
            <p>AI-powered crop intelligence for Indian farmers</p>
          </div>
        </div>
        <div className="header-badge">
          <span className="badge">AIKosh</span>
          <span className="badge">Bhashini</span>
          <span className="badge">Agmarknet</span>
          <span className="badge">Gemini 1.5</span>
        </div>
      </header>

      {/* Demo Mode Banner */}
      {IS_DEMO_MODE && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--amber-400)',
        }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <strong>DEMO MODE ACTIVE</strong>
          <span style={{ color: 'var(--text-muted)' }}>
            — LLM calls bypassed, all data served from local cache. No external dependencies.
          </span>
        </div>
      )}

      {outbreak?.outbreak && <OutbreakBanner outbreak={outbreak} />}

      {/* Tabs */}
      <nav className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            id={`tab-${t.id}`}
          >
            <span>{t.emoji}</span> {t.label}
            {t.id === 'radar' && outbreak?.outbreak && (
              <span style={{
                background: 'var(--red-500)', color: 'white',
                borderRadius: '50%', width: 18, height: 18,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>!</span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab: Diagnose */}
      {activeTab === 'diagnose' && (
        <div>
          <div className="grid-2">
            <DiagnosePanel
              onDiagnosed={setResult}
              onOutbreakUpdate={setOutbreak}
            />

            <div>
              {!result && (
                <div className="card" style={{ textAlign: 'center', padding: '60px 30px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Upload a crop photo to get started
                  </div>
                  <div className="text-muted">
                    The AI will diagnose the disease, recommend crops for your zone,
                    and provide multilingual advisory with audio.
                  </div>
                  <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="badge">38 disease classes</span>
                    <span className="badge">10 Indian languages</span>
                    <span className="badge">Govt zone data</span>
                  </div>
                </div>
              )}

              {result && <ResultBubble result={result} />}
            </div>
          </div>

          {/* CTA to Dalal if diagnosis complete */}
          {result && !result.diagnosis.is_healthy && (
            <div style={{
              marginTop: 20, padding: '16px 24px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>💰 Sell before prices drop?</div>
                <div className="text-muted">Disease detected — check AI Dalal for best market price.</div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveTab('dalal')}
                id="go-to-dalal-btn"
              >
                Open AI Dalal →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: AI Dalal */}
      {activeTab === 'dalal' && (
        <DalalChat diagnosisResult={result} />
      )}

      {/* Tab: Outbreak Radar */}
      {activeTab === 'radar' && (
        <div>
          <div className="section-title">
            🚨 Outbreak Radar
            <span className="text-muted" style={{ fontSize: 14, fontWeight: 400 }}>
              — crowd-sourced disease detection from anonymous farmer reports
            </span>
          </div>
          <MapPanel />
        </div>
      )}

    </div>
  )
}
