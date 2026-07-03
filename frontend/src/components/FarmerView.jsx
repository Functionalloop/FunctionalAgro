import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ── Time helper ────────────────────────────────────────────────────────────────
function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// ══════════════════════════════════════════════════════════════════════════════
//  DEMO SCENARIO DATA — full scripted PoC conversations
// ══════════════════════════════════════════════════════════════════════════════
const DEMO_SCENARIOS = [
  {
    id: 'tomato_blight',
    label: '🍅 Tomato Blight',
    language: 'Hindi',
    flag: '🇮🇳',
    farmerName: 'Ramesh Kumar',
    farmerLocation: 'Bangalore, Karnataka · PIN 560001',
    // The scripted message sequence that plays out
    script: [
      // ① Farmer types a message (shown as if the farmer is writing)
      {
        step: 'farmer-typing',
        duration: 1200,
      },
      // ② Farmer's message bubble appears
      {
        step: 'farmer-msg',
        inputType: 'text',
        text: 'Mere tamatar pe kuch kala daag aa gaya hai, kya hua?',
        subtext: '(My tomato has black spots, what happened?)',
        meta: '📍 560001 · हिंदी',
      },
      // ③ Bot typing
      { step: 'bot-typing', duration: 2000 },
      // ④ Transcript + translation bubble
      {
        step: 'bot-msg',
        id: 'transcript',
        header: '📝 Received & Translated',
        content: {
          type: 'transcript',
          original: 'Mere tamatar pe kuch kala daag aa gaya hai, kya hua?',
          translated: 'My tomato has some black spots, what happened?',
        },
      },
      // ⑤ Bot typing
      { step: 'bot-typing', duration: 1800 },
      // ⑥ Diagnosis bubble
      {
        step: 'bot-msg',
        id: 'diagnosis',
        header: '🌾 Kisan Alert',
        content: {
          type: 'diagnosis',
          crop: 'Tomato',
          disease: 'Late Blight',
          confidence: 0.924,
          is_healthy: false,
        },
      },
      // ⑦ Bot typing
      { step: 'bot-typing', duration: 1600 },
      // ⑧ Zone bubble
      {
        step: 'bot-msg',
        id: 'zone',
        header: '🗺️ Your Farm Zone',
        content: {
          type: 'zone',
          zone: 'Southern Plateau and Hills Region',
          district: 'Bangalore', state: 'Karnataka',
          kharif_crops: ['Cotton', 'Maize', 'Jowar'],
          rabi_crops: ['Ragi', 'Chickpea', 'Mustard'],
          soil_type: 'Red Laterite / Black Cotton',
          data_source: 'ICAR NARP 15 Agro-Climatic Zone Classification',
        },
      },
      // ⑨ Bot typing
      { step: 'bot-typing', duration: 2000 },
      // ⑩ Advisory bubble (in farmer's language)
      {
        step: 'bot-msg',
        id: 'advisory',
        header: '💬 आपकी भाषा में सलाह',
        content: {
          type: 'advisory',
          text: 'आपके टमाटर को Late Blight (देर से झुलसा रोग) हो गया है। यह एक तेज़ी से फैलने वाला फफूंद रोग है। तुरंत सभी संक्रमित पत्तियां तोड़कर जला दें और Mancozeb या Copper Oxychloride का छिड़काव करें। अगले 10 दिनों तक हर 7 दिन में छिड़काव दोहराएं।',
          english: 'Your tomato has Late Blight. Remove infected leaves immediately and spray Mancozeb or Copper Oxychloride every 7 days.',
        },
      },
      // ⑪ Bot typing
      { step: 'bot-typing', duration: 1200 },
      // ⑫ Outbreak alert
      {
        step: 'bot-msg',
        id: 'outbreak',
        header: null,
        content: {
          type: 'outbreak',
          count: 4, crop: 'Tomato', disease: 'Late Blight',
          pincode: '560001', window_days: 7,
        },
      },
      // ⑬ Bot typing
      { step: 'bot-typing', duration: 1000 },
      // ⑭ Sell CTA
      {
        step: 'bot-msg',
        id: 'cta',
        header: null,
        content: { type: 'cta' },
      },
    ],
  },
  {
    id: 'voice_marathi',
    label: '🎤 Voice (Marathi)',
    language: 'Marathi',
    flag: '🇮🇳',
    farmerName: 'Savita Patil',
    farmerLocation: 'Pune, Maharashtra · PIN 411001',
    script: [
      { step: 'farmer-typing', duration: 800 },
      {
        step: 'farmer-msg',
        inputType: 'voice',
        duration: 6,
        meta: '📍 411001 · मराठी',
      },
      { step: 'bot-typing', duration: 2200 },
      {
        step: 'bot-msg',
        id: 'transcript',
        header: '📝 ऐकले & भाषांतरित',
        content: {
          type: 'transcript',
          original: 'Mazya batatyacha pana pivala hoto ahe, kay karave?',
          translated: 'My potato leaves are turning yellow, what should I do?',
        },
      },
      { step: 'bot-typing', duration: 1800 },
      {
        step: 'bot-msg',
        id: 'diagnosis',
        header: '🌾 Kisan Alert',
        content: {
          type: 'diagnosis',
          crop: 'Potato',
          disease: 'Early Blight',
          confidence: 0.871,
          is_healthy: false,
        },
      },
      { step: 'bot-typing', duration: 1600 },
      {
        step: 'bot-msg',
        id: 'zone',
        header: '🗺️ तुमचे शेत क्षेत्र',
        content: {
          type: 'zone',
          zone: 'Western Plateau and Hills Region',
          district: 'Pune', state: 'Maharashtra',
          kharif_crops: ['Cotton', 'Soybean', 'Jowar'],
          rabi_crops: ['Chickpea', 'Wheat', 'Mustard'],
          soil_type: 'Black Cotton (Vertisol)',
          data_source: 'ICAR NARP 15 Agro-Climatic Zone Classification',
        },
      },
      { step: 'bot-typing', duration: 2000 },
      {
        step: 'bot-msg',
        id: 'advisory',
        header: '💬 तुमच्या भाषेत सल्ला',
        content: {
          type: 'advisory',
          text: 'आपल्या बटाट्याला Early Blight रोग झाला आहे. हे बुरशीजन्य संक्रमण आहे. ताबडतोब Chlorothalonil किंवा Mancozeb फवारा आणि रोगट पाने काढून टाका.',
          english: 'Your potato has Early Blight. Spray Chlorothalonil or Mancozeb immediately and remove infected leaves.',
        },
      },
      { step: 'bot-typing', duration: 1200 },
      {
        step: 'bot-msg',
        id: 'outbreak',
        header: null,
        content: {
          type: 'outbreak',
          count: 2, crop: 'Potato', disease: 'Early Blight',
          pincode: '411001', window_days: 7,
        },
      },
      { step: 'bot-typing', duration: 1000 },
      {
        step: 'bot-msg',
        id: 'cta',
        header: null,
        content: { type: 'cta' },
      },
    ],
  },
  {
    id: 'healthy_tamil',
    label: '🌱 Healthy (Tamil)',
    language: 'Tamil',
    flag: '🇮🇳',
    farmerName: 'Muthusamy R.',
    farmerLocation: 'Coimbatore, Tamil Nadu · PIN 641001',
    script: [
      { step: 'farmer-typing', duration: 1000 },
      {
        step: 'farmer-msg',
        inputType: 'text',
        text: 'என் தக்காளி செடி நல்லாவே இருக்கா? பாருங்க please',
        subtext: '(Does my tomato plant look okay? Please check)',
        meta: '📍 641001 · தமிழ்',
      },
      { step: 'bot-typing', duration: 2000 },
      {
        step: 'bot-msg',
        id: 'transcript',
        header: '📝 கேட்டது & மொழிபெயர்ப்பு',
        content: {
          type: 'transcript',
          original: 'என் தக்காளி செடி நல்லாவே இருக்கா? பாருங்க please',
          translated: 'Does my tomato plant look okay? Please check',
        },
      },
      { step: 'bot-typing', duration: 1800 },
      {
        step: 'bot-msg',
        id: 'diagnosis',
        header: '🌾 Kisan Alert',
        content: {
          type: 'diagnosis',
          crop: 'Tomato',
          disease: 'Healthy',
          confidence: 0.963,
          is_healthy: true,
        },
      },
      { step: 'bot-typing', duration: 1600 },
      {
        step: 'bot-msg',
        id: 'zone',
        header: '🗺️ உங்கள் விவசாய மண்டலம்',
        content: {
          type: 'zone',
          zone: 'Southern Plateau and Hills Region',
          district: 'Coimbatore', state: 'Tamil Nadu',
          kharif_crops: ['Cotton', 'Groundnut', 'Maize'],
          rabi_crops: ['Chickpea', 'Sunflower', 'Mustard'],
          soil_type: 'Red Laterite',
          data_source: 'ICAR NARP 15 Agro-Climatic Zone Classification',
        },
      },
      { step: 'bot-typing', duration: 2000 },
      {
        step: 'bot-msg',
        id: 'advisory',
        header: '💬 உங்கள் மொழியில் அறிவுரை',
        content: {
          type: 'advisory',
          text: 'வாழ்த்துக்கள்! உங்கள் தக்காளி செடி ஆரோக்கியமாக உள்ளது. வழக்கமான நீர்ப்பாசனம் மற்றும் உரமிடுதலை தொடர்ந்து செய்யுங்கள். வாரத்திற்கு ஒருமுறை செடிகளை சோதித்துக்கொள்ளுங்கள்.',
          english: 'Great news! Your tomato plant looks healthy. Continue regular watering and fertilization. Check plants weekly.',
        },
      },
    ],
  },
]

// ══════════════════════════════════════════════════════════════════════════════
//  CHAT BUBBLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function WaBubble({ from, children, time, animate = true }) {
  const [visible, setVisible] = useState(!animate)
  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 30)
      return () => clearTimeout(t)
    }
  }, [animate])

  return (
    <div
      className={`wa-bubble ${from}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      {children}
      <span className="wa-time">{time || nowTime()}</span>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="wa-bubble bot wa-typing">
      <span /><span /><span />
    </div>
  )
}

function VoiceNote({ audioUrl, duration = 35, simulating = false }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)
  const timer = useRef(null)

  function toggle() {
    if (audioUrl && audioRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false) }
      else { audioRef.current.play(); setPlaying(true) }
    } else {
      if (playing) { clearInterval(timer.current); setPlaying(false) }
      else {
        setPlaying(true); setProgress(0)
        timer.current = setInterval(() => {
          setProgress(p => {
            if (p >= 100) { clearInterval(timer.current); setPlaying(false); return 0 }
            return p + 2
          })
        }, 80)
      }
    }
  }

  const secs = playing ? String(Math.round(progress * duration / 100)).padStart(2, '0') : String(duration).padStart(2, '0')

  return (
    <div className="wa-voice-note" onClick={toggle}>
      {audioUrl && (
        <audio ref={audioRef} src={`http://localhost:8000${audioUrl}`}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={e => {
            const dur = e.target.duration || 1
            setProgress((e.target.currentTime / dur) * 100)
          }} />
      )}
      <div className="wa-voice-avatar">🌾</div>
      <button className="wa-voice-btn">{playing ? '⏸' : '▶'}</button>
      <div className="wa-voice-bar">
        <div className="wa-voice-progress" style={{ width: `${progress}%` }} />
        <div className="wa-voice-waveform">
          {[...Array(20)].map((_, i) => (
            <span key={i} style={{
              height: `${6 + Math.sin(i * 0.8) * 5}px`,
              background: playing ? '#25D366' : '#999',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>
      <span className="wa-voice-duration">0:{secs}</span>
    </div>
  )
}

// ── Farmer voice bubble ───────────────────────────────────────────────────────
function FarmerVoiceBubble({ duration, meta, time }) {
  return (
    <WaBubble from="farmer" time={time}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>🎤</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' }}>Voice message</span>
      </div>
      <VoiceNote duration={duration} />
      <div className="wa-meta" style={{ marginTop: 6 }}>{meta}</div>
    </WaBubble>
  )
}

// ── Bot content renderers ─────────────────────────────────────────────────────
function BotBubble({ header, content, time }) {
  return (
    <WaBubble from="bot" time={time}>
      {header && <div className="wa-bot-header">{header}</div>}
      <BotContent content={content} />
    </WaBubble>
  )
}

function BotContent({ content }) {
  switch (content.type) {
    case 'transcript':
      return (
        <div>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <span style={{ opacity: 0.6, fontSize: 10, display: 'block', marginBottom: 3 }}>🎤 What I heard / received:</span>
            <strong style={{ fontSize: 13, color: '#222', lineHeight: 1.4 }}>{content.original}</strong>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 8 }}>
            <span style={{ opacity: 0.6, fontSize: 10, display: 'block', marginBottom: 3 }}>🌐 English translation:</span>
            <span style={{ fontSize: 12, fontStyle: 'italic', color: '#075E54', fontWeight: 500 }}>{content.translated}</span>
          </div>
        </div>
      )

    case 'diagnosis': {
      const healthy = content.is_healthy
      return (
        <div>
          <div className="wa-diagnosis-crop">{content.crop}</div>
          <div className={`wa-diagnosis-disease ${healthy ? 'healthy' : 'disease'}`}>
            {healthy ? '✅ Healthy' : `⚠️ ${content.disease}`}
          </div>
          <div className="wa-confidence">{Math.round(content.confidence * 100)}% confidence</div>
          {!healthy && <div className="wa-severity-tag">🔴 High Risk — Act Now</div>}
        </div>
      )
    }

    case 'zone':
      return (
        <div>
          <div className="wa-zone-name">{content.zone}</div>
          <div className="wa-zone-meta">{content.district}, {content.state}</div>
          <div className="wa-season-row">
            <div>
              <div className="wa-season-label">☀️ Kharif</div>
              {content.kharif_crops.map((c, i) => <span key={i} className="wa-crop-tag">{c}</span>)}
            </div>
            <div>
              <div className="wa-season-label">❄️ Rabi</div>
              {content.rabi_crops.map((c, i) => <span key={i} className="wa-crop-tag">{c}</span>)}
            </div>
          </div>
          <div className="wa-source-tag">📚 {content.data_source}</div>
        </div>
      )

    case 'advisory':
      return (
        <div>
          <div className="wa-advisory-text">{content.text}</div>
          <VoiceNote duration={22} />
          <div style={{
            marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)',
            fontSize: 10, color: '#888', fontStyle: 'italic',
          }}>
            EN: {content.english}
          </div>
        </div>
      )

    case 'outbreak':
      return (
        <div className="wa-outbreak-bubble">
          <div className="wa-outbreak-icon">🚨</div>
          <div>
            <div className="wa-outbreak-title">OUTBREAK ALERT</div>
            <div className="wa-outbreak-body">
              <strong>{content.count} farmers</strong> near pincode <strong>{content.pincode}</strong> also
              reported <strong>{content.disease}</strong> in <strong>{content.crop}</strong>{' '}
              in the last {content.window_days} days.
            </div>
            <div className="wa-outbreak-action">⚠️ Warn your neighbours! Share this alert.</div>
          </div>
        </div>
      )

    case 'cta':
      return (
        <div className="wa-dalal-cta">
          <span>💰</span>
          <div>
            <div style={{ fontWeight: 700 }}>Want the best price before disease spreads?</div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
              Reply <strong>SELL</strong> to get AI Dalal price negotiation now.
            </div>
          </div>
        </div>
      )

    default:
      return null
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  DEMO PLAYER — steps through a scenario script with timing
// ══════════════════════════════════════════════════════════════════════════════
function DemoPlayer({ scenario }) {
  const [visibleMessages, setVisibleMessages] = useState([])
  const [showTyping, setShowTyping] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)
  const msgTime = useRef(nowTime())

  const reset = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisibleMessages([])
    setShowTyping(false)
    setStepIndex(0)
    setPlaying(false)
    setDone(false)
    msgTime.current = nowTime()
  }, [])

  // Reset when scenario changes
  useEffect(() => { reset() }, [scenario.id, reset])

  const runStep = useCallback((idx, script) => {
    if (idx >= script.length) {
      setShowTyping(false)
      setPlaying(false)
      setDone(true)
      return
    }
    const step = script[idx]

    if (step.step === 'farmer-typing') {
      setShowTyping(true)
      timerRef.current = setTimeout(() => {
        setShowTyping(false)
        setStepIndex(idx + 1)
        runStep(idx + 1, script)
      }, step.duration)
    }

    else if (step.step === 'farmer-msg') {
      msgTime.current = nowTime()
      setVisibleMessages(prev => [...prev, { ...step, _key: `f-${idx}`, time: msgTime.current }])
      setStepIndex(idx + 1)
      timerRef.current = setTimeout(() => runStep(idx + 1, script), 400)
    }

    else if (step.step === 'bot-typing') {
      setShowTyping(true)
      timerRef.current = setTimeout(() => {
        setShowTyping(false)
        setStepIndex(idx + 1)
        runStep(idx + 1, script)
      }, step.duration)
    }

    else if (step.step === 'bot-msg') {
      msgTime.current = nowTime()
      setVisibleMessages(prev => [...prev, { ...step, _key: `b-${idx}`, time: msgTime.current }])
      setStepIndex(idx + 1)
      timerRef.current = setTimeout(() => runStep(idx + 1, script), 300)
    }
  }, [])

  function startPlay() {
    reset()
    setPlaying(true)
    // Small delay so reset finishes
    timerRef.current = setTimeout(() => {
      runStep(0, scenario.script)
    }, 200)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className="wa-messages">
      {/* Intro state */}
      {!playing && !done && visibleMessages.length === 0 && (
        <div className="wa-empty-state demo-start-state">
          <div style={{ fontSize: 42, marginBottom: 8 }}>📱</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#333', marginBottom: 4 }}>
            {scenario.farmerName}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
            {scenario.farmerLocation} · {scenario.language}
          </div>
          <button className="demo-play-btn" onClick={startPlay} id={`demo-play-${scenario.id}`}>
            ▶ Play Conversation
          </button>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>
            Watch a farmer interact with Kisan Alert
          </div>
        </div>
      )}

      {/* Rendered messages */}
      {visibleMessages.map((msg) => {
        if (msg.step === 'farmer-msg') {
          if (msg.inputType === 'voice') {
            return <FarmerVoiceBubble key={msg._key} duration={msg.duration} meta={msg.meta} time={msg.time} />
          }
          return (
            <WaBubble key={msg._key} from="farmer" time={msg.time}>
              <div className="wa-farmer-text">{msg.text}</div>
              {msg.subtext && <div className="wa-farmer-subtext">{msg.subtext}</div>}
              <div className="wa-meta">{msg.meta}</div>
            </WaBubble>
          )
        }
        if (msg.step === 'bot-msg') {
          return (
            <BotBubble key={msg._key} header={msg.header} content={msg.content} time={msg.time} />
          )
        }
        return null
      })}

      {/* Typing indicator */}
      {showTyping && <TypingIndicator />}

      {/* Done — replay */}
      {done && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button
            onClick={startPlay}
            style={{
              background: 'rgba(18,140,126,0.12)', border: '1px solid rgba(18,140,126,0.3)',
              borderRadius: 20, padding: '8px 20px', color: '#075E54',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            🔄 Replay
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  VOICE RECORDER HOOK
// ══════════════════════════════════════════════════════════════════════════════
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [duration, setDuration] = useState(0)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const [error, setError] = useState(null)

  async function startRecording() {
    setError(null); setAudioBlob(null); setDuration(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: mimeType }))
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch { setError('Microphone access denied. Allow mic & retry.') }
  }

  function stopRecording() {
    if (mediaRef.current && recording) {
      mediaRef.current.stop(); setRecording(false)
      clearInterval(timerRef.current)
    }
  }

  function reset() { setAudioBlob(null); setDuration(0); setError(null) }

  return { recording, audioBlob, duration, error, startRecording, stopRecording, reset }
}

// ══════════════════════════════════════════════════════════════════════════════
//  LIVE CONVERSATION MESSAGES
// ══════════════════════════════════════════════════════════════════════════════
function LiveConversation({ messages }) {
  return (
    <div className="wa-messages">
      {messages.map((msg, i) => {
        if (msg.type === 'farmer-text') {
          return (
            <WaBubble key={i} from="farmer" animate={false} time={msg.time}>
              <div className="wa-farmer-text">{msg.text}</div>
              <div className="wa-meta">📍 {msg.pincode} · {msg.language}</div>
            </WaBubble>
          )
        }
        if (msg.type === 'farmer-voice') {
          return (
            <WaBubble key={i} from="farmer" animate={false} time={msg.time}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>🎤</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Voice message</span>
              </div>
              <VoiceNote duration={msg.duration} />
              <div className="wa-meta" style={{ marginTop: 6 }}>📍 {msg.pincode} · {msg.language}</div>
            </WaBubble>
          )
        }
        if (msg.type === 'transcript') {
          return (
            <WaBubble key={i} from="bot" animate={false} time={msg.time}>
              <div className="wa-bot-header">📝 Received & Translated</div>
              <BotContent content={{ type: 'transcript', original: msg.original, translated: msg.translated }} />
            </WaBubble>
          )
        }
        if (msg.type === 'advisory') {
          return (
            <WaBubble key={i} from="bot" animate={false} time={msg.time}>
              <div className="wa-bot-header">💬 Advice in your language</div>
              <div className="wa-advisory-text">{msg.advisory_text}</div>
              <VoiceNote audioUrl={msg.audio_url} duration={22} />
              {msg.advisory_english && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: 10, color: '#888', fontStyle: 'italic' }}>
                  EN: {msg.advisory_english}
                </div>
              )}
            </WaBubble>
          )
        }
        return null
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN FARMER VIEW
// ══════════════════════════════════════════════════════════════════════════════
export default function FarmerView({ diagnosisResult }) {
  const [activeScenario, setActiveScenario] = useState(DEMO_SCENARIOS[0])
  const [mode, setMode] = useState('demo')
  const [liveImage, setLiveImage] = useState(null)
  const [liveResult, setLiveResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pincode, setPincode] = useState('560001')
  const [language, setLanguage] = useState('hindi')
  const chatRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [inputMode, setInputMode] = useState('text')
  const [textInput, setTextInput] = useState('')
  const voice = useVoiceRecorder()

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [activeScenario, liveResult, messages, loading])

  useEffect(() => {
    if (diagnosisResult) { setMode('live'); setLiveResult(diagnosisResult) }
  }, [diagnosisResult])

  // ── Photo send ───────────────────────────────────────────────────────────
  async function handlePhotoSend() {
    if (!liveImage) return
    setLoading(true); setError(null); setLiveResult(null)
    try {
      const fd = new FormData()
      fd.append('image', liveImage); fd.append('pincode', pincode)
      const { data: diagnosis } = await axios.post(`${API}/diagnose`, fd)
      const { data: zone }      = await axios.get(`${API}/recommend-crop?pincode=${pincode}`)
      const { data: advisory }  = await axios.post(`${API}/advise`, { crop: diagnosis.crop, disease: diagnosis.disease, language, pincode })
      const { data: outbreak }  = await axios.get(`${API}/outbreak-check?pincode=${pincode}&crop=${diagnosis.crop}`)
      setLiveResult({ diagnosis, zone, advisory, outbreak, language, pincode })
    } catch (err) { setError(err.response?.data?.detail || 'Backend not running?') }
    finally { setLoading(false) }
  }

  // ── Text send ────────────────────────────────────────────────────────────
  async function handleTextSend() {
    const text = textInput.trim(); if (!text) return
    const t = nowTime()
    setMessages(prev => [...prev, { type: 'farmer-text', text, pincode, language, time: t }])
    setTextInput(''); setLoading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('text', text); fd.append('language', language); fd.append('pincode', pincode)
      const { data } = await axios.post(`${API}/farmer-input`, fd)
      setMessages(prev => [...prev,
        { type: 'transcript', original: data.transcript_original, translated: data.english_translation, time: nowTime() },
        { type: 'advisory', advisory_text: data.advisory_text, advisory_english: data.advisory_english, audio_url: data.audio_url, time: nowTime() },
      ])
    } catch (err) { setError(err.response?.data?.detail || 'Backend not reachable. Is it running?') }
    finally { setLoading(false) }
  }

  // ── Voice send ───────────────────────────────────────────────────────────
  async function handleVoiceSend() {
    if (!voice.audioBlob) return
    const t = nowTime()
    setMessages(prev => [...prev, { type: 'farmer-voice', pincode, language, duration: voice.duration, time: t }])
    const blob = voice.audioBlob; voice.reset()
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'voice.webm'); fd.append('language', language); fd.append('pincode', pincode)
      const { data } = await axios.post(`${API}/farmer-input`, fd)
      setMessages(prev => [...prev,
        { type: 'transcript', original: data.transcript_original, translated: data.english_translation, time: nowTime() },
        { type: 'advisory', advisory_text: data.advisory_text, advisory_english: data.advisory_english, audio_url: data.audio_url, time: nowTime() },
      ])
    } catch (err) { setError(err.response?.data?.detail || 'Backend not reachable.') }
    finally { setLoading(false) }
  }

  return (
    <div className="farmer-view">
      <div className="wa-phone-frame">

        {/* WA Header */}
        <div className="wa-header">
          <div className="wa-avatar">🌾</div>
          <div className="wa-contact">
            <div className="wa-contact-name">Kisan Alert</div>
            <div className="wa-contact-status">
              {loading ? '⏳ Processing...' : mode === 'demo' ? '✓ PoC Demo — Scripted Walkthrough' : '✓ AI Agricultural Advisor · Live'}
            </div>
          </div>
          <div className="wa-header-icons">📞 ⋮</div>
        </div>

        {/* Mode bar */}
        <div className="wa-mode-bar">
          <button className={`wa-mode-btn ${mode === 'demo' ? 'active' : ''}`}
            onClick={() => { setMode('demo'); setLiveResult(null); setMessages([]) }}>
            🎬 Demo PoC
          </button>
          <button className={`wa-mode-btn ${mode === 'live' ? 'active' : ''}`}
            onClick={() => setMode('live')}>
            📡 Live
          </button>
        </div>

        {/* Demo scenario pills */}
        {mode === 'demo' && (
          <div className="wa-scenarios">
            {DEMO_SCENARIOS.map(s => (
              <button key={s.id}
                className={`wa-scenario-pill ${activeScenario.id === s.id ? 'active' : ''}`}
                onClick={() => setActiveScenario(s)}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Live input mode tabs */}
        {mode === 'live' && (
          <div className="wa-input-mode-bar">
            {['text', 'voice', 'photo'].map(m => (
              <button key={m}
                className={`wa-input-mode-btn ${inputMode === m ? 'active' : ''}`}
                onClick={() => setInputMode(m)}>
                {m === 'text' ? '✏️ Text' : m === 'voice' ? '🎤 Voice' : '📷 Photo'}
              </button>
            ))}
          </div>
        )}

        {/* Chat area */}
        <div className="wa-chat-bg" ref={chatRef}>
          <div className="wa-date-divider">Today · {new Date().toLocaleDateString('en-IN')}</div>
          <div className="wa-system-msg">
            🔒 Messages are end-to-end encrypted.<br />
            {mode === 'demo'
              ? 'Demo PoC — scripted farmer conversation walkthrough'
              : 'Live mode — type, speak, or upload a photo'}
          </div>

          {/* DEMO mode — animated player */}
          {mode === 'demo' && (
            <DemoPlayer key={activeScenario.id} scenario={activeScenario} />
          )}

          {/* LIVE mode — real messages */}
          {mode === 'live' && messages.length > 0 && <LiveConversation messages={messages} />}

          {/* Live: photo result */}
          {mode === 'live' && liveResult && (() => {
            const { diagnosis, zone, advisory, outbreak } = liveResult
            const healthy = diagnosis.is_healthy
            return (
              <div className="wa-messages">
                <WaBubble from="farmer" animate={false}>
                  {liveImage && <img src={URL.createObjectURL(liveImage)} alt="crop" className="wa-photo" />}
                  <div className="wa-farmer-text">Meri fasal ki photo dekho...</div>
                  <div className="wa-meta">📍 {pincode} · {language}</div>
                </WaBubble>
                <WaBubble from="bot" delay={400}>
                  <div className="wa-bot-header">🌾 Kisan Alert</div>
                  <BotContent content={{ type: 'diagnosis', ...diagnosis }} />
                </WaBubble>
                <WaBubble from="bot" delay={800}>
                  <div className="wa-bot-header">🗺️ Your Farm Zone</div>
                  <BotContent content={{ type: 'zone', ...zone }} />
                </WaBubble>
                <WaBubble from="bot" delay={1200}>
                  <div className="wa-bot-header">💬 Advisory</div>
                  <BotContent content={{ type: 'advisory', text: advisory.advisory_text, english: advisory.advisory_english }} />
                </WaBubble>
                {outbreak?.outbreak && (
                  <WaBubble from="bot" delay={1600}>
                    <BotContent content={{ type: 'outbreak', ...outbreak }} />
                  </WaBubble>
                )}
                {!healthy && (
                  <WaBubble from="bot" delay={outbreak?.outbreak ? 2000 : 1600}>
                    <BotContent content={{ type: 'cta' }} />
                  </WaBubble>
                )}
              </div>
            )
          })()}

          {/* Live empty */}
          {mode === 'live' && messages.length === 0 && !liveResult && !loading && (
            <div className="wa-empty-state">
              <div style={{ fontSize: 36 }}>📱</div>
              <div style={{ marginTop: 10, fontWeight: 600, color: '#555' }}>How would you like to ask?</div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#888', lineHeight: 1.8 }}>
                ✏️ <strong>Text</strong> — any language<br />
                🎤 <strong>Voice</strong> — speak in Hindi, Tamil, etc.<br />
                📷 <strong>Photo</strong> — crop image diagnosis
              </div>
            </div>
          )}

          {loading && <div className="wa-messages"><TypingIndicator /></div>}

          {error && (
            <div className="wa-system-msg" style={{ color: '#ef4444' }}>⚠️ {error}</div>
          )}
        </div>

        {/* Live input bar */}
        {mode === 'live' && (
          <div className="wa-input-bar-wrapper">
            {inputMode === 'text' && (
              <div className="wa-input-bar">
                <textarea
                  className="wa-text-input wa-text-area"
                  placeholder={`Type in ${language} or any language...`}
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() } }}
                  rows={2} id="farmer-text-input"
                />
                <button className="wa-send-btn" onClick={handleTextSend}
                  disabled={!textInput.trim() || loading} id="farmer-text-send-btn">
                  {loading ? '⏳' : '➤'}
                </button>
              </div>
            )}

            {inputMode === 'voice' && (
              <div className="wa-voice-recorder">
                {voice.error && <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>⚠️ {voice.error}</div>}
                {!voice.recording && !voice.audioBlob && (
                  <div style={{ textAlign: 'center' }}>
                    <button className="wa-record-btn" onClick={voice.startRecording} id="farmer-voice-start-btn">
                      <span style={{ fontSize: 24 }}>🎤</span><span>Tap to Record</span>
                    </button>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Speak in {language} — Gemini transcribes & translates</div>
                  </div>
                )}
                {voice.recording && (
                  <div style={{ textAlign: 'center' }}>
                    <div className="wa-recording-pulse">
                      <span style={{ fontSize: 24 }}>🔴</span>
                      <span style={{ marginLeft: 8, color: '#e74c3c', fontWeight: 700 }}>Recording... {voice.duration}s</span>
                    </div>
                    <button className="wa-record-btn stop" onClick={voice.stopRecording} id="farmer-voice-stop-btn">
                      ⏹ Stop
                    </button>
                  </div>
                )}
                {voice.audioBlob && !voice.recording && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, color: '#128C7E', fontWeight: 600 }}>✅ {voice.duration}s recorded</span>
                    <button className="wa-send-btn" onClick={handleVoiceSend} disabled={loading} id="farmer-voice-send-btn" style={{ padding: '10px 18px', width: 'auto', borderRadius: 20 }}>
                      {loading ? '⏳' : '➤ Send'}
                    </button>
                    <button style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#888' }} onClick={voice.reset}>🗑</button>
                  </div>
                )}
              </div>
            )}

            {inputMode === 'photo' && (
              <div className="wa-input-bar">
                <label className="wa-attach-btn" htmlFor="wa-file-input">📎</label>
                <input id="wa-file-input" type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { setLiveImage(e.target.files[0]); setLiveResult(null) }} />
                <div className="wa-text-input">
                  {liveImage ? `📸 ${liveImage.name} · PIN ${pincode}` : 'Upload crop photo for AI diagnosis...'}
                </div>
                <button className="wa-send-btn" onClick={handlePhotoSend} disabled={!liveImage || loading} id="wa-send-btn">
                  {loading ? '⏳' : '➤'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="wa-live-settings">
        {mode === 'demo' && (
          <div className="glass-panel" style={{ background: 'rgba(4, 20, 14, 0.45)' }}>
            <div className="card-title" style={{ fontSize: 15, color: 'var(--green-500)' }}>🎬 Demo PoC Scenarios</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, marginTop: 8 }}>
              <div>🍅 <strong>Tomato Blight</strong> — farmer types in Hindi about black spots → AI diagnoses Late Blight → advisory + outbreak alert</div>
              <div style={{ marginTop: 8 }}>🎤 <strong>Voice Marathi</strong> — farmer sends voice note in Marathi → Gemini transcribes → Early Blight advisory</div>
              <div style={{ marginTop: 8 }}>🌱 <strong>Healthy Tamil</strong> — farmer asks in Tamil → crop confirmed healthy → Tamil advisory</div>
            </div>
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(37,211,102,0.06)', borderRadius: 10, border: '1px solid rgba(37,211,102,0.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-400)', marginBottom: 6 }}>KEY PoC FEATURES</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                ✓ Multilingual voice + text input<br />
                ✓ Live transcript + English translation<br />
                ✓ Gemini-powered disease advisory<br />
                ✓ Audio response in farmer's language<br />
                ✓ Crowd-sourced outbreak detection<br />
                ✓ AI Dalal price negotiation CTA
              </div>
            </div>
          </div>
        )}

        {mode === 'live' && (
          <div className="glass-panel" style={{ background: 'rgba(4, 20, 14, 0.45)' }}>
            <div className="card-title" style={{ fontSize: 15, color: 'var(--green-500)' }}>📡 Live Settings</div>
            <div className="form-group">
              <label>📍 Pincode</label>
              <input className="form-input" value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            </div>
            <div className="form-group">
              <label>🌐 Farmer Language</label>
              <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="hindi">हिंदी (Hindi)</option>
                <option value="english">English</option>
                <option value="tamil">தமிழ் (Tamil)</option>
                <option value="telugu">తెలుగు (Telugu)</option>
                <option value="kannada">ಕನ್ನಡ (Kannada)</option>
                <option value="marathi">मराठी (Marathi)</option>
                <option value="bengali">বাংলা (Bengali)</option>
                <option value="punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
              </select>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.7 }}>
              ✏️ <strong>Text</strong> — type in any Indian language<br />
              🎤 <strong>Voice</strong> — Gemini transcribes + translates<br />
              📷 <strong>Photo</strong> — PlantVillage classifier
            </div>
            {(messages.length > 0 || liveResult) && (
              <button style={{ marginTop: 14, width: '100%', padding: '8px 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                onClick={() => { setMessages([]); setLiveResult(null); setLiveImage(null) }}>
                🗑 Clear Chat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
