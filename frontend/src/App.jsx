import { useState, useEffect } from 'react'
import DiagnosePanel  from './components/DiagnosePanel'
import ResultBubble   from './components/ResultBubble'
import OutbreakBanner from './components/OutbreakBanner'
import DalalChat      from './components/DalalChat'
import MapPanel       from './components/MapPanel'
import Hero           from './components/Hero'
import BentoGrid      from './components/BentoGrid'
import FarmerView     from './components/FarmerView'
import ProfitCalc     from './components/ProfitCalc'
import { auth, provider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'diagnose',  label: 'Diagnose' },
  { id: 'farmer',    label: 'Farmer View' },
  { id: 'radar',     label: 'Outbreak Radar' },
  { id: 'dalal',     label: 'AI Dalal' },
  { id: 'profit',    label: 'Profit Calculator' },
]

export default function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [result, setResult]               = useState(null)
  const [outbreak, setOutbreak]           = useState(null)
  const [user, setUser]                   = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const handleSignIn = async () => {
    try { await signInWithPopup(auth, provider) } catch (e) { console.error(e) }
  }

  const handleSignOut = async () => {
    try { await signOut(auth) } catch (e) { console.error(e) }
  }

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const viewportMid = window.scrollY + window.innerHeight / 3
      for (const { id } of NAV_ITEMS) {
        const el = document.getElementById(id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (viewportMid >= top && viewportMid < top + height) {
            setActiveSection(id)
            break
          }
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div>
      {/* ── Top Navigation ──────────────────────────────────────── */}
      <header className="top-nav">
        <button className="nav-brand" onClick={() => scrollTo('overview')}>
          <div className="nav-brand-mark">🌾</div>
          <div>
            <span className="nav-brand-name">FunctionalAgro</span>
            <span className="nav-brand-tagline">Smart farming platform</span>
          </div>
        </button>

        <nav className="nav-links">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-link${activeSection === id ? ' active' : ''}`}
              onClick={() => scrollTo(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="nav-auth">
          {user ? (
            <>
              {user.photoURL && (
                <img src={user.photoURL} alt="Profile" className="nav-user-avatar" />
              )}
              <span className="nav-user-name">{user.displayName?.split(' ')[0]}</span>
              <button className="btn btn-sm btn-danger" onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-sm btn-secondary" onClick={handleSignIn} id="login-btn">
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      {/* ── Fixed Outbreak Alert ─────────────────────────────────── */}
      {outbreak?.outbreak && <OutbreakBanner outbreak={outbreak} />}

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="app-wrapper">

        {IS_DEMO_MODE && (
          <div className="demo-ribbon">
            🔒 <strong>Demo mode</strong> — LLM calls bypassed via seed files
          </div>
        )}

        {/* 1. Overview */}
        <section id="overview">
          <Hero
            onStartDiagnose={() => scrollTo('diagnose')}
            onStartDalal={() => scrollTo('dalal')}
          />
          <div className="section-divider" />
          <BentoGrid onSelectTab={(tabId) => {
            const target = tabId === 'diagnose' ? 'diagnose' : tabId === 'dalal' ? 'dalal' : 'radar'
            scrollTo(target)
          }} />
        </section>

        {/* 2. Diagnose */}
        <section id="diagnose" className="page-section">
          <div className="section-eyebrow">Crop Health</div>
          <h2 className="section-heading">Diagnose your plants</h2>
          <p className="section-subheading">
            Upload a photo of your crop leaf. Our edge AI classifies disease on-device — no internet needed for the initial scan.
          </p>
          <div className="grid-2">
            <DiagnosePanel
              onDiagnosed={setResult}
              onOutbreakUpdate={setOutbreak}
            />
            <div>
              {!result ? (
                <div className="panel empty-state" style={{ minHeight: 320 }}>
                  <span className="empty-state-icon">🌿</span>
                  <h3 className="empty-state-title">Awaiting scan</h3>
                  <p className="empty-state-body">
                    Upload a crop photograph to begin analysis. Detects 38 disease classes with Hindi, Tamil and other language audio advisory.
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                    <span className="badge">TensorFlow.js Edge</span>
                    <span className="badge">10 Languages</span>
                    <span className="badge">AIKosh Zone Data</span>
                  </div>
                </div>
              ) : (
                <ResultBubble result={result} />
              )}
            </div>
          </div>

          {result && !result.diagnosis.is_healthy && (
            <div className="panel" style={{
              marginTop: 20,
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              borderColor: 'rgba(192,57,43,0.3)',
              background: 'var(--alert-pale)'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--alert)', marginBottom: 4 }}>
                  Disease detected — sell before it spreads?
                </div>
                <div className="text-muted">Check live market rates on AI Dalal before the infection impacts your crop value.</div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => scrollTo('dalal')}
                id="go-to-dalal-btn"
              >
                Open AI Dalal →
              </button>
            </div>
          )}
        </section>

        {/* 3. Farmer View */}
        <section id="farmer" className="page-section">
          <div className="section-eyebrow">Field Interface</div>
          <h2 className="section-heading">Farmer's mobile view</h2>
          <p className="section-subheading">
            Simulates the low-bandwidth WhatsApp interface delivered directly to farmers on feature phones.
          </p>
          <FarmerView diagnosisResult={result} />
        </section>

        {/* 4. Outbreak Radar */}
        <section id="radar" className="page-section">
          <div className="section-eyebrow">Disease Surveillance</div>
          <h2 className="section-heading">Outbreak radar</h2>
          <p className="section-subheading">
            Anonymous, crowdsourced disease tracking. When cases cluster in a region, local farmers get an alert.
          </p>
          <MapPanel />
        </section>

        {/* 5. AI Dalal */}
        <section id="dalal" className="page-section">
          <div className="section-eyebrow">Price Negotiation</div>
          <h2 className="section-heading">Negotiate with AI Dalal</h2>
          <p className="section-subheading">
            Three competing traders bid for your crop in real time, anchored against live Agmarknet government prices.
          </p>
          <DalalChat diagnosisResult={result} />
        </section>

        {/* 6. Profit Calculator */}
        <section id="profit" className="page-section">
          <div className="section-eyebrow">Financial Planning</div>
          <h2 className="section-heading">MSP vs market profit</h2>
          <p className="section-subheading">
            Compare Government MSP vs AI Dalal vs open market to find which channel gives you the highest net profit per acre.
          </p>
          <ProfitCalc />
        </section>

      </div>
    </div>
  )
}
