import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useStudyRoom } from '../hooks/useStudyRoom'
import { subjectApi, sessionApi } from '../services/api'

// ── Layout constants ──────────────────────────────────────────────
const CARD_W  = 82
const CARD_H  = 90
const GAP     = 10
const TABLE_W = 160
const TABLE_H = 100
const WRAP_W  = TABLE_W + 2 * (CARD_W + GAP)   // 344
const WRAP_H  = TABLE_H + 2 * (CARD_H + GAP)   // 300

const ROOM_PAD_TOP  = 24
const ROOM_PAD_SIDE = 20

const SEAT_POS = {
  N: { top: 0,                                               left: Math.round((WRAP_W - CARD_W) / 2) },
  S: { top: CARD_H + GAP + TABLE_H + GAP,                   left: Math.round((WRAP_W - CARD_W) / 2) },
  E: { top: CARD_H + GAP + Math.round((TABLE_H - CARD_H) / 2), left: CARD_W + GAP + TABLE_W + GAP },
  W: { top: CARD_H + GAP + Math.round((TABLE_H - CARD_H) / 2), left: 0 },
}

// Center pixel of each seat within the room box (for walking animation)
function getSeatCenter(seatId) {
  const m = seatId.match(/T(\d)_([NSEW])/)
  if (!m) return null
  const n   = parseInt(m[1])  // 1–4
  const dir = m[2]
  const col = (n - 1) % 2
  const row = Math.floor((n - 1) / 2)
  const wx  = ROOM_PAD_SIDE + col * (WRAP_W + 24)
  const wy  = ROOM_PAD_TOP  + row * (WRAP_H + 24)
  const sp  = SEAT_POS[dir]
  return { x: wx + sp.left + CARD_W / 2, y: wy + sp.top + CARD_H / 2 }
}

// Door position: bottom-center inside the room box
const DOOR_X = ROOM_PAD_SIDE + (2 * WRAP_W + 24) / 2
const DOOR_Y = ROOM_PAD_TOP + 2 * WRAP_H + 24 + 16

// ── Misc ──────────────────────────────────────────────────────────
const STATUS_PRESETS = [
  'Lendo aula', 'Resolvendo questões', 'Revisando', 'Fazendo resumo',
  'Ouvindo podcast', 'Lendo doutrina', 'Simulado', 'Mapa mental',
]

function formatElapsed(sittingAt) {
  const secs = Math.floor((Date.now() - new Date(sittingAt).getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}m`
  if (m > 0) return `${m}min`
  return 'agora'
}
function getInitial(n) { return (n || '?')[0].toUpperCase() }

const HAIR_COLORS = [
  '#1a0f08', // dark brown
  '#0d0d0d', // black
  '#5a2d0a', // auburn
  '#b87830', // blonde
  '#3a2040', // dark purple-brown
  '#e8c080', // light/golden
]

function traitFor(userId) {
  const n = Math.abs(Number(userId || 0))
  return {
    hair:      HAIR_COLORS[n % HAIR_COLORS.length],
    hairStyle: Math.floor(n / HAIR_COLORS.length) % 4,
    glasses:   n % 3 === 0,
  }
}

// ── Ambient sound (fixed) ─────────────────────────────────────────
const AMBIENT_MODES = [
  { id: 'off',    label: 'Sons Off', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> },
  { id: 'rain',   label: 'Chuva',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg> },
  { id: 'forest', label: 'Floresta', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><path d="M17 14l-5-5-5 5"/><path d="M17 20l-5-5-5 5"/><line x1="12" y1="9" x2="12" y2="23"/></svg> },
  { id: 'ocean',  label: 'Oceano',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><path d="M2 12s2-4 5-4 5 4 5 4 2-4 5-4 5 4 5 4"/><path d="M2 18s2-4 5-4 5 4 5 4 2-4 5-4 5 4 5 4"/></svg> },
]

function useAmbientSound() {
  const [modeIdx, setModeIdx] = useState(0)
  const audioRef = useRef(null) // { ctx, gain, source }
  const timerRef = useRef(null)

  const stopCurrent = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = null
    const a = audioRef.current
    audioRef.current = null
    if (!a) return
    try { a.gain.gain.setValueAtTime(0, a.ctx.currentTime) } catch {}
    try { a.source.stop() } catch {}
    setTimeout(() => { try { a.ctx.close() } catch {} }, 300)
  }, [])

  const startMode = useCallback((mode) => {
    if (mode === 'off') return
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)()
      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.connect(ctx.destination)

      const len = 6 * ctx.sampleRate
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d   = buf.getChannelData(0)
      let source, targetVol = 0.2

      if (mode === 'rain') {
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
        source = ctx.createBufferSource(); source.buffer = buf; source.loop = true
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.45
        source.connect(f); f.connect(gain); source.start(); targetVol = 0.2

      } else if (mode === 'forest') {
        let last = 0
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1
          d[i] = (last + 0.02 * w) / 1.02; last = d[i]; d[i] *= 3.5
        }
        source = ctx.createBufferSource(); source.buffer = buf; source.loop = true
        source.connect(gain); source.start(); targetVol = 0.22

      } else if (mode === 'ocean') {
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
        source = ctx.createBufferSource(); source.buffer = buf; source.loop = true
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.1
        const lg = ctx.createGain(); lg.gain.value = 130
        lfo.connect(lg); lg.connect(f.frequency); lfo.start()
        source.connect(f); f.connect(gain); source.start(); targetVol = 0.32
      }

      gain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.2)
      audioRef.current = { ctx, gain, source }
    } catch (e) { console.warn('Audio', e) }
  }, [])

  // Start new sound via effect — never inside a state updater
  useEffect(() => {
    const mode = AMBIENT_MODES[modeIdx].id
    if (mode === 'off') return
    timerRef.current = setTimeout(() => startMode(mode), 120)
    return () => {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [modeIdx, startMode])

  const cycle = useCallback(() => {
    stopCurrent()
    setModeIdx(prev => (prev + 1) % AMBIENT_MODES.length)
  }, [stopCurrent])

  useEffect(() => () => stopCurrent(), [stopCurrent])
  return { ambientMode: AMBIENT_MODES[modeIdx], cycleAmbient: cycle }
}

// ── Session timer ─────────────────────────────────────────────────

function fmtSecs(s) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[[523.25,0],[659.25,0.28],[783.99,0.56]].forEach(([freq,when]) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.22
      o.connect(g); g.connect(ctx.destination)
      o.start(ctx.currentTime+when)
      g.gain.setTargetAtTime(0, ctx.currentTime+when+0.25, 0.1)
      o.stop(ctx.currentTime+when+0.6)
    })
    setTimeout(() => { try { ctx.close() } catch {} }, 2200)
  } catch {}
}

function SessionPickerModal({ onFree, onPomodoro, onSkip }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div style={{background:'linear-gradient(160deg,#0f1629 0%,#0a0d1a 100%)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:24,width:360,maxWidth:'94vw',boxShadow:'0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(99,102,241,0.1)',overflow:'hidden'}}>
        <div style={{padding:'24px 24px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(99,102,241,0.04)'}}>
          <h3 style={{color:'#e2e8f0',fontSize:17,fontWeight:800,margin:0,letterSpacing:'-0.01em'}}>Como quer estudar?</h3>
          <p style={{color:'#64748b',fontSize:12,margin:'4px 0 0'}}>Escolha o modo da sua sessão</p>
        </div>
        <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:10}}>
          <button onClick={onFree}
            style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:16,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',cursor:'pointer',textAlign:'left',transition:'all 0.15s',width:'100%'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(245,158,11,0.1)';e.currentTarget.style.borderColor='rgba(245,158,11,0.28)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(245,158,11,0.06)';e.currentTarget.style.borderColor='rgba(245,158,11,0.15)'}}>
            <div style={{width:42,height:42,borderRadius:12,background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#f59e0b'}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9.5 3h5"/><path d="M12 3v2"/></svg></div>
            <div>
              <p style={{color:'#e2e8f0',fontSize:13,fontWeight:700,margin:0}}>Sessão Livre</p>
              <p style={{color:'#64748b',fontSize:11,margin:'3px 0 0'}}>Cronômetro sobe enquanto você estuda</p>
            </div>
          </button>
          <button onClick={onPomodoro}
            style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:16,background:'rgba(124,58,237,0.06)',border:'1px solid rgba(124,58,237,0.15)',cursor:'pointer',textAlign:'left',transition:'all 0.15s',width:'100%'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(124,58,237,0.12)';e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(124,58,237,0.06)';e.currentTarget.style.borderColor='rgba(124,58,237,0.15)'}}>
            <div style={{width:42,height:42,borderRadius:12,background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#a78bfa'}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div>
              <p style={{color:'#e2e8f0',fontSize:13,fontWeight:700,margin:0}}>Pomodoro</p>
              <p style={{color:'#64748b',fontSize:11,margin:'3px 0 0'}}>Sessão de foco com pausas programadas</p>
            </div>
          </button>
        </div>
        <div style={{padding:'0 16px 20px',textAlign:'center'}}>
          <button onClick={onSkip}
            style={{background:'none',border:'none',color:'#334155',fontSize:12,cursor:'pointer',padding:'4px 8px',transition:'color 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.color='#64748b'}
            onMouseLeave={e=>e.currentTarget.style.color='#334155'}>
            Estudar sem timer
          </button>
        </div>
      </div>
    </div>
  )
}

function FocusDurationModal({ onStart, onBack }) {
  const [duration, setDuration] = useState(25)
  const presets = [25, 30, 45, 50]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div style={{background:'linear-gradient(160deg,#0f1629 0%,#0a0d1a 100%)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:24,width:360,maxWidth:'94vw',boxShadow:'0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(99,102,241,0.1)',overflow:'hidden'}}>
        <div style={{padding:'24px 24px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(99,102,241,0.04)'}}>
          <h3 style={{color:'#e2e8f0',fontSize:17,fontWeight:800,margin:0}}>Tempo de foco</h3>
          <p style={{color:'#64748b',fontSize:12,margin:'4px 0 0'}}>Quanto tempo você quer focar?</p>
        </div>
        <div style={{padding:'20px 24px'}}>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {presets.map(p=>(
              <button key={p} onClick={()=>setDuration(p)} style={{
                flex:1, padding:'9px 0', borderRadius:12, fontSize:12, fontWeight:700, cursor:'pointer',
                background: duration===p ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                color: duration===p ? '#a78bfa' : '#64748b',
                border: duration===p ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)',
                transition:'all 0.12s',
              }}>{p}min</button>
            ))}
          </div>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{color:'#e2e8f0',fontSize:52,fontWeight:900,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.04em',lineHeight:1}}>
              {duration}<span style={{fontSize:20,fontWeight:600,color:'#475569',marginLeft:4}}>min</span>
            </div>
            <input type="range" min={5} max={90} step={5} value={duration}
              onChange={e=>setDuration(+e.target.value)}
              style={{width:'100%',marginTop:12,accentColor:'#7c3aed',cursor:'pointer'}}/>
          </div>
          <button onClick={()=>onStart(duration)} style={{width:'100%',padding:'13px 0',borderRadius:14,border:'none',cursor:'pointer',background:'#7c3aed',color:'white',fontSize:14,fontWeight:800,marginBottom:8}}>
            Iniciar sessão
          </button>
          <button onClick={onBack} style={{width:'100%',padding:'10px 0',borderRadius:14,background:'transparent',border:'1px solid rgba(255,255,255,0.08)',color:'#64748b',fontSize:13,cursor:'pointer'}}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  )
}

function SessionEndModal({ focusMin, onBreak, onSkipBreak, onLeave }) {
  const [breakMin, setBreakMin] = useState(5)
  const presets = [5, 10, 15]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div style={{background:'linear-gradient(160deg,#0f1629 0%,#0a0d1a 100%)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:24,width:360,maxWidth:'94vw',boxShadow:'0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(99,102,241,0.1)',overflow:'hidden'}}>
        <div style={{padding:'28px 24px 20px',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(99,102,241,0.03)'}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(34,197,94,0.12)',border:'2px solid rgba(34,197,94,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',color:'#22c55e'}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:26,height:26}}><path d="M20 6L9 17l-5-5"/></svg></div>
          <h3 style={{color:'#e2e8f0',fontSize:17,fontWeight:800,margin:0}}>Sessão de {focusMin}min concluída!</h3>
          <p style={{color:'#64748b',fontSize:12,margin:'6px 0 0'}}>Ótimo trabalho! Hora de descansar?</p>
        </div>
        <div style={{padding:'20px 24px'}}>
          <p style={{color:'#64748b',fontSize:11,fontWeight:700,letterSpacing:'0.06em',margin:'0 0 10px'}}>TEMPO DE PAUSA</p>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {presets.map(p=>(
              <button key={p} onClick={()=>setBreakMin(p)} style={{
                flex:1, padding:'9px 0', borderRadius:12, fontSize:12, fontWeight:700, cursor:'pointer',
                background: breakMin===p ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                color: breakMin===p ? '#22c55e' : '#64748b',
                border: breakMin===p ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.08)',
                transition:'all 0.12s',
              }}>{p}min</button>
            ))}
          </div>
          <button onClick={()=>onBreak(breakMin)} style={{width:'100%',padding:'13px 0',borderRadius:14,cursor:'pointer',background:'rgba(34,197,94,0.12)',color:'#22c55e',fontSize:14,fontWeight:800,border:'1px solid rgba(34,197,94,0.25)',marginBottom:8}}>
            Pausar por {breakMin}min
          </button>
          <button onClick={onSkipBreak} style={{width:'100%',padding:'10px 0',borderRadius:14,background:'transparent',border:'1px solid rgba(255,255,255,0.08)',color:'#64748b',fontSize:13,cursor:'pointer',marginBottom:8}}>
            Nova sessão sem pausa
          </button>
          <button onClick={onLeave}
            style={{width:'100%',padding:'10px 0',borderRadius:14,background:'transparent',border:'1px solid rgba(255,100,100,0.12)',color:'#7c5050',fontSize:13,cursor:'pointer'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(239,68,68,0.28)';e.currentTarget.style.color='#f87171'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,100,100,0.12)';e.currentTarget.style.color='#7c5050'}}>
            Levantar da mesa
          </button>
        </div>
      </div>
    </div>
  )
}

function BreakEndModal({ breakMin, onNewSession, onLeave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div style={{background:'linear-gradient(160deg,#0f1629 0%,#0a0d1a 100%)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:24,width:340,maxWidth:'94vw',boxShadow:'0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(99,102,241,0.1)',overflow:'hidden'}}>
        <div style={{padding:'28px 24px 20px',textAlign:'center',background:'rgba(99,102,241,0.03)'}}>
          <div style={{fontSize:44,marginBottom:12,lineHeight:1}}>⏰</div>
          <h3 style={{color:'#e2e8f0',fontSize:17,fontWeight:800,margin:0}}>Pausa de {breakMin}min acabou!</h3>
          <p style={{color:'#64748b',fontSize:12,margin:'6px 0 0'}}>Pronto para mais uma sessão?</p>
        </div>
        <div style={{padding:'0 24px 24px',display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={onNewSession} style={{width:'100%',padding:'13px 0',borderRadius:14,border:'none',cursor:'pointer',background:'#7c3aed',color:'white',fontSize:14,fontWeight:800}}>
            Iniciar nova sessão
          </button>
          <button onClick={onLeave}
            style={{width:'100%',padding:'11px 0',borderRadius:14,background:'transparent',border:'1px solid rgba(255,100,100,0.12)',color:'#7c5050',fontSize:13,cursor:'pointer'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(239,68,68,0.28)';e.currentTarget.style.color='#f87171'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,100,100,0.12)';e.currentTarget.style.color='#7c5050'}}>
            Levantar da mesa
          </button>
        </div>
      </div>
    </div>
  )
}

function SessionBar({ sessionType, phase, seconds, paused, count, onPause, onLeave }) {
  const label    = phase === 'break' ? 'Pausa' : sessionType === 'free' ? 'Sessão Livre' : 'Foco'
  const dotColor = phase === 'break' ? '#22c55e' : sessionType === 'free' ? '#f59e0b' : '#7c3aed'
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      zIndex:40,
      background:'rgba(8,12,26,0.97)',
      border:'1px solid rgba(99,102,241,0.2)',
      borderRadius:100, padding:'10px 18px',
      display:'flex', alignItems:'center', gap:16,
      boxShadow:'0 8px 40px rgba(0,0,0,0.85)',
      backdropFilter:'blur(16px)',
      userSelect:'none', whiteSpace:'nowrap',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:dotColor,flexShrink:0,boxShadow:paused?'none':`0 0 8px ${dotColor}88`}}/>
        <span style={{color:'#64748b',fontSize:11,fontWeight:700,letterSpacing:'0.05em'}}>{label.toUpperCase()}</span>
        {count > 0 && sessionType==='pomodoro' && (
          <span style={{background:'rgba(99,102,241,0.1)',color:'#818cf8',fontSize:9,padding:'1px 5px',borderRadius:10,fontWeight:800}}>{count}×</span>
        )}
      </div>
      <span style={{color:'#e2e8f0',fontSize:22,fontWeight:900,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.03em',minWidth:58,textAlign:'center'}}>
        {fmtSecs(seconds)}
      </span>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        {sessionType==='pomodoro' && (
          <button onClick={onPause}
            style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'#64748b',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='#e2e8f0'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='#64748b'}}>
            {paused
              ? <svg viewBox="0 0 24 24" fill="currentColor" style={{width:12,height:12}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" style={{width:12,height:12}}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            }
          </button>
        )}
        <button onClick={onLeave}
          style={{padding:'5px 14px',borderRadius:20,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.18)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
          Levantar
        </button>
      </div>
    </div>
  )
}

// ── Character SVG ─────────────────────────────────────────────────
const SKIN = '#fcd5a5'
const SKIN_S = '#e4b48a'

function CharacterSVG({ color, size = 50, userId = 0 }) {
  const s = size / 64
  const { hair, hairStyle, glasses } = traitFor(userId)
  return (
    <svg width={64*s} height={68*s} viewBox="0 0 64 68" fill="none">
      <ellipse cx="32" cy="66" rx="13" ry="2.5" fill="rgba(0,0,0,0.18)"/>

      {/* Legs */}
      <path d="M22 53 L21 61 Q21 63 24 63 L28 63 Q30 63 30 61 L29 53 Z" fill="#2d3748"/>
      <path d="M34 53 L33 61 Q33 63 36 63 L40 63 Q42 63 42 61 L43 53 Z" fill="#2d3748"/>
      <path d="M20 61 Q19 66 25 66 L29 66 Q32 66 31 62 Z" fill="#1a2030"/>
      <path d="M33 61 Q32 66 36 66 L40 66 Q45 66 44 62 Z" fill="#1a2030"/>
      <path d="M20 62 L31 62" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"/>
      <path d="M33 62 L44 62" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"/>

      {/* Body */}
      <path d="M15 38 Q15 33 24 31 L40 31 Q49 33 49 38 L49 53 Q49 55 44 55 L20 55 Q15 55 15 53 Z" fill={color}/>
      <path d="M15 48 Q32 53 49 48 L49 53 Q49 55 44 55 L20 55 Q15 55 15 53 Z" fill="rgba(0,0,0,0.08)"/>
      <path d="M26 31 L32 37 L38 31" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.3" strokeLinejoin="round"/>

      {/* Arms */}
      <path d="M15 38 Q10 41 8 47 Q7 51 9 54" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M15 38 Q10 41 8 47 Q7 51 9 54" stroke="rgba(0,0,0,0.06)" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M49 38 Q54 41 56 47 Q57 51 55 54" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
      <circle cx="9" cy="55" r="3.5" fill={SKIN}/>
      <circle cx="55" cy="55" r="3.5" fill={SKIN}/>

      {/* Neck */}
      <rect x="27" y="27" width="10" height="6" rx="4" fill={SKIN}/>
      <path d="M27 31 Q32 33 37 31 L37 33 L27 33 Z" fill="rgba(0,0,0,0.05)"/>

      {/* Head */}
      <ellipse cx="32" cy="17" rx="14" ry="15" fill={SKIN}/>
      <ellipse cx="32" cy="22" rx="10" ry="7" fill="rgba(0,0,0,0.02)"/>

      {/* Hair */}
      {hairStyle === 0 && <>
        <ellipse cx="32" cy="5" rx="15" ry="9" fill={hair}/>
        <rect x="17" y="5" width="30" height="8" fill={hair}/>
        <path d="M17 13 L17 20 Q18 19 18 16 Z" fill={hair}/>
        <path d="M47 13 L47 20 Q46 19 46 16 Z" fill={hair}/>
        <path d="M20 3 Q32 -1 44 3 Q42 7 32 6 Q22 7 20 3 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 1 && <>
        <ellipse cx="32" cy="4" rx="15" ry="9" fill={hair}/>
        <rect x="16" y="4" width="8" height="28" rx="4" fill={hair}/>
        <rect x="40" y="4" width="8" height="28" rx="4" fill={hair}/>
        <ellipse cx="20" cy="31" rx="5" ry="4" fill={hair}/>
        <ellipse cx="44" cy="31" rx="5" ry="4" fill={hair}/>
        <path d="M20 3 Q32 -1 44 3 Q42 7 32 6 Q22 7 20 3 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 2 && <>
        <ellipse cx="32" cy="5" rx="15" ry="9" fill={hair}/>
        <path d="M17 13 L17 20 Q18 19 18 16 Z" fill={hair}/>
        <path d="M47 13 L47 20 Q46 19 46 16 Z" fill={hair}/>
        <path d="M22 7 L19 0 L26 6 Z" fill={hair}/>
        <path d="M29 5 L28 -2 L34 5 Z" fill={hair}/>
        <path d="M38 6 L40 0 L44 7 Z" fill={hair}/>
        <path d="M20 3 Q32 -1 44 3 Q42 7 32 6 Q22 7 20 3 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 3 && <>
        <path d="M17 16 Q18 2 25 6 Q28 0 32 4 Q36 0 39 6 Q46 2 47 16 Q45 24 32 22 Q19 24 17 16 Z" fill={hair}/>
        <ellipse cx="16" cy="21" rx="4" ry="7" fill={hair}/>
        <ellipse cx="48" cy="21" rx="4" ry="7" fill={hair}/>
      </>}

      {/* Ears */}
      <ellipse cx="18" cy="19" rx="3" ry="4" fill={SKIN}/>
      <ellipse cx="46" cy="19" rx="3" ry="4" fill={SKIN}/>
      <ellipse cx="18" cy="19" rx="1.8" ry="2.5" fill={SKIN_S} opacity="0.5"/>
      <ellipse cx="46" cy="19" rx="1.8" ry="2.5" fill={SKIN_S} opacity="0.5"/>

      {/* Eyes */}
      <ellipse cx="25" cy="18" rx="3.8" ry="4.2" fill="white"/>
      <ellipse cx="39" cy="18" rx="3.8" ry="4.2" fill="white"/>
      <circle cx="25.5" cy="19" r="2.8" fill="#2d1810"/>
      <circle cx="39.5" cy="19" r="2.8" fill="#2d1810"/>
      <circle cx="25.5" cy="19" r="1.8" fill={color} opacity="0.35"/>
      <circle cx="39.5" cy="19" r="1.8" fill={color} opacity="0.35"/>
      <circle cx="25.5" cy="19.5" r="1" fill="#080808"/>
      <circle cx="39.5" cy="19.5" r="1" fill="#080808"/>
      <circle cx="26.8" cy="17.5" r="1.2" fill="white"/>
      <circle cx="40.8" cy="17.5" r="1.2" fill="white"/>
      <circle cx="24.5" cy="20" r="0.5" fill="white" opacity="0.5"/>
      <circle cx="38.5" cy="20" r="0.5" fill="white" opacity="0.5"/>

      {/* Eyebrows */}
      <path d="M21 12.5 Q25 10.5 28 12.5" stroke={hair} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M36 12.5 Q39 10.5 43 12.5" stroke={hair} strokeWidth="1.6" strokeLinecap="round" fill="none"/>

      {/* Nose */}
      <path d="M31 23 Q32 24.5 33 23" stroke="#c89070" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>

      {/* Smile */}
      <path d="M27 26 Q32 30 37 26" stroke="#c4785a" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

      {/* Blush */}
      <ellipse cx="19.5" cy="23" rx="3.5" ry="2" fill="#f4a0b0" opacity="0.28"/>
      <ellipse cx="44.5" cy="23" rx="3.5" ry="2" fill="#f4a0b0" opacity="0.28"/>

      {/* Glasses */}
      {glasses && <>
        <ellipse cx="25" cy="18" rx="5.5" ry="5" fill="none" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <ellipse cx="39" cy="18" rx="5.5" ry="5" fill="none" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <line x1="30.5" y1="17.5" x2="33.5" y2="17.5" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <line x1="15" y1="17" x2="19.5" y2="17.5" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <line x1="49" y1="17" x2="44.5" y2="17.5" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
      </>}
    </svg>
  )
}

// Walking version
function CharacterWalkSVG({ color, userId = 0, size = 54 }) {
  const s = size / 64
  const { hair, hairStyle, glasses } = traitFor(userId)
  return (
    <svg width={64*s} height={68*s} viewBox="0 0 64 68" fill="none" className="walk-anim">
      <ellipse cx="32" cy="66" rx="13" ry="2.5" fill="rgba(0,0,0,0.2)"/>

      {/* Legs */}
      <path d="M22 53 L21 61 Q21 63 24 63 L28 63 Q30 63 30 61 L29 53 Z" fill="#2d3748"/>
      <path d="M34 53 L33 61 Q33 63 36 63 L40 63 Q42 63 42 61 L43 53 Z" fill="#2d3748"/>
      <path d="M20 61 Q19 66 25 66 L29 66 Q32 66 31 62 Z" fill="#1a2030"/>
      <path d="M33 61 Q32 66 36 66 L40 66 Q45 66 44 62 Z" fill="#1a2030"/>

      {/* Body */}
      <path d="M15 38 Q15 33 24 31 L40 31 Q49 33 49 38 L49 53 Q49 55 44 55 L20 55 Q15 55 15 53 Z" fill={color}/>
      <path d="M15 48 Q32 53 49 48 L49 53 Q49 55 44 55 L20 55 Q15 55 15 53 Z" fill="rgba(0,0,0,0.08)"/>
      <path d="M26 31 L32 37 L38 31" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.3" strokeLinejoin="round"/>

      {/* Arms */}
      <path d="M15 38 Q10 41 8 47 Q7 51 9 54" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M49 38 Q54 41 56 47 Q57 51 55 54" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
      <circle cx="9" cy="55" r="3.5" fill={SKIN}/>
      <circle cx="55" cy="55" r="3.5" fill={SKIN}/>

      {/* Neck */}
      <rect x="27" y="27" width="10" height="6" rx="4" fill={SKIN}/>

      {/* Head */}
      <ellipse cx="32" cy="17" rx="14" ry="15" fill={SKIN}/>

      {/* Hair */}
      {hairStyle === 0 && <>
        <ellipse cx="32" cy="5" rx="15" ry="9" fill={hair}/>
        <rect x="17" y="5" width="30" height="8" fill={hair}/>
        <path d="M17 13 L17 20 Q18 19 18 16 Z" fill={hair}/>
        <path d="M47 13 L47 20 Q46 19 46 16 Z" fill={hair}/>
        <path d="M20 3 Q32 -1 44 3 Q42 7 32 6 Q22 7 20 3 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 1 && <>
        <ellipse cx="32" cy="4" rx="15" ry="9" fill={hair}/>
        <rect x="16" y="4" width="8" height="28" rx="4" fill={hair}/>
        <rect x="40" y="4" width="8" height="28" rx="4" fill={hair}/>
        <ellipse cx="20" cy="31" rx="5" ry="4" fill={hair}/>
        <ellipse cx="44" cy="31" rx="5" ry="4" fill={hair}/>
        <path d="M20 3 Q32 -1 44 3 Q42 7 32 6 Q22 7 20 3 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 2 && <>
        <ellipse cx="32" cy="5" rx="15" ry="9" fill={hair}/>
        <path d="M17 13 L17 20 Q18 19 18 16 Z" fill={hair}/>
        <path d="M47 13 L47 20 Q46 19 46 16 Z" fill={hair}/>
        <path d="M22 7 L19 0 L26 6 Z" fill={hair}/>
        <path d="M29 5 L28 -2 L34 5 Z" fill={hair}/>
        <path d="M38 6 L40 0 L44 7 Z" fill={hair}/>
        <path d="M20 3 Q32 -1 44 3 Q42 7 32 6 Q22 7 20 3 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 3 && <>
        <path d="M17 16 Q18 2 25 6 Q28 0 32 4 Q36 0 39 6 Q46 2 47 16 Q45 24 32 22 Q19 24 17 16 Z" fill={hair}/>
        <ellipse cx="16" cy="21" rx="4" ry="7" fill={hair}/>
        <ellipse cx="48" cy="21" rx="4" ry="7" fill={hair}/>
      </>}

      {/* Ears */}
      <ellipse cx="18" cy="19" rx="3" ry="4" fill={SKIN}/>
      <ellipse cx="46" cy="19" rx="3" ry="4" fill={SKIN}/>

      {/* Eyes */}
      <ellipse cx="25" cy="18" rx="3.8" ry="4.2" fill="white"/>
      <ellipse cx="39" cy="18" rx="3.8" ry="4.2" fill="white"/>
      <circle cx="25.5" cy="19" r="2.8" fill="#2d1810"/>
      <circle cx="39.5" cy="19" r="2.8" fill="#2d1810"/>
      <circle cx="25.5" cy="19" r="1.8" fill={color} opacity="0.35"/>
      <circle cx="39.5" cy="19" r="1.8" fill={color} opacity="0.35"/>
      <circle cx="25.5" cy="19.5" r="1" fill="#080808"/>
      <circle cx="39.5" cy="19.5" r="1" fill="#080808"/>
      <circle cx="26.8" cy="17.5" r="1.2" fill="white"/>
      <circle cx="40.8" cy="17.5" r="1.2" fill="white"/>

      {/* Eyebrows */}
      <path d="M21 12.5 Q25 10.5 28 12.5" stroke={hair} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M36 12.5 Q39 10.5 43 12.5" stroke={hair} strokeWidth="1.6" strokeLinecap="round" fill="none"/>

      {/* Nose */}
      <path d="M31 23 Q32 24.5 33 23" stroke="#c89070" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>

      {/* Smile */}
      <path d="M27 26 Q32 30 37 26" stroke="#c4785a" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

      {/* Blush */}
      <ellipse cx="19.5" cy="23" rx="3.5" ry="2" fill="#f4a0b0" opacity="0.28"/>
      <ellipse cx="44.5" cy="23" rx="3.5" ry="2" fill="#f4a0b0" opacity="0.28"/>

      {/* Glasses */}
      {glasses && <>
        <ellipse cx="25" cy="18" rx="5.5" ry="5" fill="none" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <ellipse cx="39" cy="18" rx="5.5" ry="5" fill="none" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <line x1="30.5" y1="17.5" x2="33.5" y2="17.5" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <line x1="15" y1="17" x2="19.5" y2="17.5" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
        <line x1="49" y1="17" x2="44.5" y2="17.5" stroke="#4a3010" strokeWidth="1.1" opacity="0.65"/>
      </>}
    </svg>
  )
}

// Seated version
function SeatedCharacterSVG({ color, size = 44, userId = 0 }) {
  const s = size / 64
  const { hair, hairStyle, glasses } = traitFor(userId)
  return (
    <svg width={64*s} height={56*s} viewBox="0 0 64 56" fill="none">

      {/* Chair back */}
      <rect x="22" y="28" width="20" height="18" rx="4" fill="rgba(0,0,0,0.22)"/>

      {/* Body / torso */}
      <path d="M14 50 L14 28 Q16 22 26 21 L38 21 Q48 22 50 28 L50 50 Z" fill={color}/>
      <path d="M26 21 L32 28 L38 21" stroke="rgba(255,255,255,0.18)" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
      <path d="M14 45 Q32 49 50 45 L50 50 L14 50 Z" fill="rgba(0,0,0,0.08)"/>

      {/* Arms on desk */}
      <path d="M15 32 Q8 38 9 46" stroke={color} strokeWidth="8" strokeLinecap="round"/>
      <path d="M49 32 Q56 38 55 46" stroke={color} strokeWidth="8" strokeLinecap="round"/>

      {/* Desk surface */}
      <rect x="0" y="43" width="64" height="13" rx="0" fill="#1a1208" opacity="0.85"/>
      <rect x="0" y="43" width="64" height="3" rx="0" fill="#2e1f0a" opacity="0.6"/>

      {/* Book */}
      <rect x="17" y="38" width="13" height="10" rx="1.5" fill="#e8d49a"/>
      <rect x="30" y="38" width="13" height="10" rx="1.5" fill="#f0dfb0"/>
      <line x1="30" y1="38.5" x2="30" y2="47.5" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2"/>
      <line x1="31" y1="38.5" x2="31" y2="47.5" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7"/>
      {[41, 43.5, 46].map(y => (
        <line key={`bl${y}`} x1="19" y1={y} x2="28" y2={y} stroke="rgba(0,0,0,0.1)" strokeWidth="0.7"/>
      ))}
      {[41, 43.5, 46].map(y => (
        <line key={`br${y}`} x1="32" y1={y} x2="41" y2={y} stroke="rgba(0,0,0,0.1)" strokeWidth="0.7"/>
      ))}

      {/* Hands on desk */}
      <ellipse cx="9" cy="44" rx="4.5" ry="3.2" fill={SKIN}/>
      <ellipse cx="55" cy="44" rx="4.5" ry="3.2" fill={SKIN}/>

      {/* Neck */}
      <rect x="28" y="15" width="8" height="7" rx="3" fill={SKIN}/>
      <path d="M28 19 Q32 21 36 19 L36 22 L28 22 Z" fill="rgba(0,0,0,0.04)"/>

      {/* Head */}
      <ellipse cx="32" cy="10" rx="12" ry="12" fill={SKIN}/>
      <ellipse cx="32" cy="14" rx="8" ry="5" fill="rgba(0,0,0,0.02)"/>

      {/* Hair */}
      {hairStyle === 0 && <>
        <ellipse cx="32" cy="2" rx="13" ry="7" fill={hair}/>
        <rect x="19" y="2" width="26" height="7" fill={hair}/>
        <path d="M19 9 L19 14 Q20 13 20 11 Z" fill={hair}/>
        <path d="M45 9 L45 14 Q44 13 44 11 Z" fill={hair}/>
        <path d="M22 1 Q32 -2 42 1 Q40 5 32 4 Q24 5 22 1 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 1 && <>
        <ellipse cx="32" cy="1" rx="13" ry="7" fill={hair}/>
        <rect x="18" y="1" width="7" height="20" rx="3.5" fill={hair}/>
        <rect x="39" y="1" width="7" height="20" rx="3.5" fill={hair}/>
        <path d="M22 1 Q32 -2 42 1 Q40 5 32 4 Q24 5 22 1 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 2 && <>
        <ellipse cx="32" cy="2" rx="13" ry="7" fill={hair}/>
        <path d="M19 9 L19 14 Q20 13 20 11 Z" fill={hair}/>
        <path d="M45 9 L45 14 Q44 13 44 11 Z" fill={hair}/>
        <path d="M24 5 L22 0 L28 4 Z" fill={hair}/>
        <path d="M30 3 L29 -2 L34 3 Z" fill={hair}/>
        <path d="M36 4 L38 0 L42 5 Z" fill={hair}/>
        <path d="M22 1 Q32 -2 42 1 Q40 5 32 4 Q24 5 22 1 Z" fill="rgba(255,255,255,0.07)"/>
      </>}
      {hairStyle === 3 && <>
        <path d="M19 12 Q20 0 27 4 Q30 -1 32 2 Q34 -1 37 4 Q44 0 45 12 Q43 18 32 17 Q21 18 19 12 Z" fill={hair}/>
        <ellipse cx="18" cy="14" rx="4" ry="6" fill={hair}/>
        <ellipse cx="46" cy="14" rx="4" ry="6" fill={hair}/>
      </>}

      {/* Ears */}
      <ellipse cx="20" cy="11" rx="2.5" ry="3.5" fill={SKIN}/>
      <ellipse cx="44" cy="11" rx="2.5" ry="3.5" fill={SKIN}/>
      <ellipse cx="20" cy="11" rx="1.5" ry="2" fill={SKIN_S} opacity="0.4"/>
      <ellipse cx="44" cy="11" rx="1.5" ry="2" fill={SKIN_S} opacity="0.4"/>

      {/* Eyes — looking down (reading) */}
      <ellipse cx="26" cy="10" rx="3.5" ry="3.8" fill="white"/>
      <ellipse cx="38" cy="10" rx="3.5" ry="3.8" fill="white"/>
      <circle cx="26" cy="11" r="2.5" fill="#2d1810"/>
      <circle cx="38" cy="11" r="2.5" fill="#2d1810"/>
      <circle cx="26" cy="11" r="1.5" fill={color} opacity="0.35"/>
      <circle cx="38" cy="11" r="1.5" fill={color} opacity="0.35"/>
      <circle cx="26" cy="11.5" r="0.8" fill="#080808"/>
      <circle cx="38" cy="11.5" r="0.8" fill="#080808"/>
      <circle cx="27" cy="9" r="1" fill="white"/>
      <circle cx="39" cy="9" r="1" fill="white"/>

      {/* Eyebrows */}
      <path d="M22 5.5 Q26 4 29 5.5" stroke={hair} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <path d="M35 5.5 Q38 4 42 5.5" stroke={hair} strokeWidth="1.4" strokeLinecap="round" fill="none"/>

      {/* Nose */}
      <path d="M31 14 Q32 15.2 33 14" stroke="#c89070" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.45"/>

      {/* Mouth — focused */}
      <path d="M28 17 Q32 20 36 17" stroke="#c4785a" strokeWidth="1.4" strokeLinecap="round" fill="none"/>

      {/* Blush */}
      <ellipse cx="21" cy="13.5" rx="3" ry="1.8" fill="#f4a0b0" opacity="0.25"/>
      <ellipse cx="43" cy="13.5" rx="3" ry="1.8" fill="#f4a0b0" opacity="0.25"/>

      {/* Glasses */}
      {glasses && <>
        <ellipse cx="26" cy="10" rx="5" ry="4.5" fill="none" stroke="#4a3010" strokeWidth="1" opacity="0.6"/>
        <ellipse cx="38" cy="10" rx="5" ry="4.5" fill="none" stroke="#4a3010" strokeWidth="1" opacity="0.6"/>
        <line x1="31" y1="10" x2="33" y2="10" stroke="#4a3010" strokeWidth="1" opacity="0.6"/>
        <line x1="16" y1="9" x2="21" y2="9.5" stroke="#4a3010" strokeWidth="1" opacity="0.6"/>
        <line x1="48" y1="9" x2="43" y2="9.5" stroke="#4a3010" strokeWidth="1" opacity="0.6"/>
      </>}
    </svg>
  )
}


// ── Entry animation ───────────────────────────────────────────────
function WalkingCharacter({ occupant, seatId, onDone }) {
  const [phase, setPhase] = useState('door') // door → walking → arrived
  const target = getSeatCenter(seatId)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('walking'), 60)
    const t2 = setTimeout(() => { setPhase('arrived'); onDoneRef.current() }, 2100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (!target || phase === 'arrived') return null

  const x = phase === 'walking' ? target.x : DOOR_X
  const y = phase === 'walking' ? target.y : DOOR_Y

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: 'translate(-50%, -60%)',
      transition: phase === 'walking'
        ? 'left 1.8s cubic-bezier(0.4,0,0.2,1), top 1.8s cubic-bezier(0.4,0,0.2,1)'
        : 'none',
      zIndex: 60,
      pointerEvents: 'none',
      filter: `drop-shadow(0 6px 16px ${occupant.avatarColor}88)`,
    }}>
      <CharacterWalkSVG color={occupant.avatarColor} userId={occupant.userId} size={54}/>
    </div>
  )
}

// ── Room decorations ──────────────────────────────────────────────
function DeskLampSVG() {
  return (
    <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
      <rect x="6"  y="30" width="16" height="3"  rx="1.5" fill="#5a3518"/>
      <rect x="12" y="14" width="2"  height="17" rx="1"   fill="#4a2e14"/>
      <path d="M12 14 Q8 8 4 10 Q6 4 12 6 Q14 4 16 6 Q20 8 16 12 Z" fill="#6b4226"/>
      <ellipse cx="10" cy="22" rx="8"  ry="4"  fill="#f59e0b" opacity="0.14"/>
      <ellipse cx="10" cy="28" rx="12" ry="6"  fill="#f59e0b" opacity="0.06"/>
    </svg>
  )
}

function TableItems() {
  return (
    <svg className="absolute pointer-events-none select-none"
      style={{bottom:8,left:'50%',transform:'translateX(-50%)',opacity:0.42}}
      width="120" height="44" viewBox="0 0 120 44" fill="none">
      <rect x="4"  y="8"  width="38" height="28" rx="3" fill="#4f46e5"/>
      <rect x="4"  y="8"  width="6"  height="28" rx="2" fill="#3730a3"/>
      <rect x="12" y="16" width="26" height="2"  rx="1" fill="rgba(255,255,255,0.3)"/>
      <rect x="12" y="21" width="22" height="2"  rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="12" y="26" width="24" height="2"  rx="1" fill="rgba(255,255,255,0.2)"/>
      <rect x="80" y="12" width="20" height="22" rx="4" fill="#334155"/>
      <rect x="80" y="12" width="20" height="5"  rx="3" fill="#475569"/>
      <path d="M100 18 Q108 19 108 24 Q108 29 100 30" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M85 10 Q87 6 85 2" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.45"/>
      <path d="M91 10 Q93 6 91 2" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.45"/>
      <rect x="56" y="8" width="4" height="26" rx="2" fill="#f59e0b" opacity="0.7"/>
      <path d="M56 34 L60 34 L58 40 Z" fill="#f59e0b" opacity="0.7"/>
    </svg>
  )
}

// ── Tooltip (portal — renders above overflow:hidden containers) ───
function CharacterTooltip({ occupant, isMine, subjects, onUpdate, onLeave, anchorRef, onMouseEnter, onMouseLeave }) {
  const [editing, setEditing]       = useState(false)
  const [selSubject, setSelSubject] = useState(occupant.subjectName || '')
  const [selStatus,  setSelStatus]  = useState(occupant.status      || '')
  const [custom, setCustom]         = useState('')
  const [pos, setPos]               = useState({ top: 0, left: 0, arrowDown: true })
  const W = 248

  useEffect(() => {
    if (!anchorRef?.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const spaceAbove = r.top
    const spaceBelow = window.innerHeight - r.bottom
    const arrowDown  = spaceAbove > 220 || spaceAbove >= spaceBelow

    let top  = arrowDown ? r.top - 12 : r.bottom + 12
    let left = r.left + r.width / 2 - W / 2
    left = Math.max(8, Math.min(left, window.innerWidth - W - 8))
    setPos({ top, left, arrowDown })
  }, [anchorRef, editing])

  const handleSave = () => {
    const statusValue = selStatus === '__custom__' ? custom : selStatus
    const sub = subjects.find(s => s.name === selSubject)?.name ?? selSubject ?? null
    onUpdate(sub || null, statusValue || null)
    setEditing(false)
  }

  const arrowStyle = pos.arrowDown
    ? { bottom: -6, top: 'auto', borderBottom: 'none', borderRight: 'none', borderTop: `1px solid ${occupant.avatarColor}30`, borderLeft: `1px solid ${occupant.avatarColor}30` }
    : { top: -6, bottom: 'auto', borderTop: 'none', borderLeft: 'none', borderBottom: `1px solid ${occupant.avatarColor}30`, borderRight: `1px solid ${occupant.avatarColor}30` }

  const content = (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: pos.arrowDown ? pos.top - (editing ? 310 : 185) : pos.top,
        left: pos.left,
        width: W,
        zIndex: 9999,
        background: 'rgba(8, 12, 26, 0.98)',
        border: `1px solid ${occupant.avatarColor}30`,
        borderRadius: 18,
        boxShadow: `0 24px 64px rgba(0,0,0,0.92), 0 0 40px ${occupant.avatarColor}10`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${occupant.avatarColor}18, ${occupant.avatarColor}08)`, borderBottom: `1px solid ${occupant.avatarColor}18`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flexShrink: 0, position: 'relative' }}>
          {occupant.avatarData ? (
            <img src={occupant.avatarData} alt={occupant.userName} style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover', border: `2px solid ${occupant.avatarColor}55` }} />
          ) : (
            <CharacterSVG color={occupant.avatarColor} size={40} userId={occupant.userId} />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 13, margin: 0 }}>{occupant.userName}</p>
            {isMine && (
              <span style={{ background: `${occupant.avatarColor}20`, color: occupant.avatarColor, fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.03em' }}>
                você
              </span>
            )}
            {occupant.estado && (
              <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 600 }}>
                {occupant.estado}
              </span>
            )}
          </div>
          <p style={{ color: '#64748b', fontSize: 11, margin: '3px 0 0', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {occupant.status || 'Estudando'}
          </p>
        </div>
        {/* Elapsed time badge */}
        <div style={{ flexShrink: 0, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(occupant.sittingAt)}</span>
        </div>
      </div>

      {/* Info rows */}
      {!editing && (
        <div style={{ padding: '10px 14px 4px' }}>
          {(occupant.concurso || occupant.examName || occupant.subjectName) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
              {(occupant.concurso || occupant.examName) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: `${occupant.avatarColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={occupant.avatarColor} strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
                  </div>
                  <span style={{ color: occupant.avatarColor, fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{occupant.concurso || occupant.examName}</span>
                </div>
              )}
              {occupant.subjectName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                  </div>
                  <span style={{ color: '#a5b4fc', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{occupant.subjectName}</span>
                </div>
              )}
            </div>
          )}
          {/* Buttons */}
          {isMine && (
            <div style={{ display: 'flex', gap: 7, paddingBottom: 12 }}>
              <button
                onClick={() => setEditing(true)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 12, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.color = '#a5b4fc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.color = '#818cf8' }}
              >
                Editar status
              </button>
              <button
                onClick={onLeave}
                style={{ flex: 1, padding: '8px 0', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              >
                Levantar
              </button>
            </div>
          )}
          {!isMine && <div style={{ height: 10 }} />}
        </div>
      )}

      {/* Editing state */}
      {editing && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>DISCIPLINA</label>
            <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="rounded-xl px-3.5 py-2.5 text-sm transition-colors" style={{ width: '100%', background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}>
              <option value="">Sem matéria</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>ATIVIDADE</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {STATUS_PRESETS.map(p => (
                <button key={p} onClick={() => { setSelStatus(p); setCustom('') }}
                  style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, background: selStatus === p ? occupant.avatarColor : 'rgba(255,255,255,0.04)', color: selStatus === p ? 'white' : '#64748b', border: selStatus === p ? 'none' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.12s' }}>
                  {p}
                </button>
              ))}
            </div>
            <input placeholder="Ou escreva aqui..." value={selStatus === '__custom__' ? custom : ''} onChange={e => { setSelStatus('__custom__'); setCustom(e.target.value) }} onFocus={() => setSelStatus('__custom__')}
              style={{ width: '100%', background: '#080d1a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '7px 10px', fontSize: 12, color: '#a5b4fc', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={handleSave} style={{ flex: 1, padding: '9px 0', borderRadius: 12, background: occupant.avatarColor, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Salvar</button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Arrow */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
        width: 10, height: 10,
        background: 'rgba(8,12,26,0.98)',
        ...arrowStyle,
      }} />
    </div>
  )

  return createPortal(content, document.body)
}

// ── Facing rotation per seat direction ────────────────────────────
const FACING_ROT = { N: 0, S: 180, E: -90, W: 90 }

// ── Occupied card ─────────────────────────────────────────────────
function OccupiedCard({ occupant, isMine, subjects, onUpdate, onLeave, hidden, direction }) {
  const [hov, setHov] = useState(false)
  const ref       = useRef(null)
  const timerRef  = useRef(null)

  const openTooltip  = useCallback(() => { clearTimeout(timerRef.current); setHov(true)  }, [])
  const closeTooltip = useCallback(() => { timerRef.current = setTimeout(() => setHov(false), 120) }, [])

  const rot = FACING_ROT[direction] || 0

  return (
    <div ref={ref}
      style={{ width: CARD_W, height: CARD_H, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0,
        opacity: hidden ? 0 : 1, transition: hidden ? 'none' : 'opacity 0.5s ease 0.3s' }}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
    >
      {hov && (
        <CharacterTooltip
          occupant={occupant} isMine={isMine} subjects={subjects}
          onUpdate={onUpdate} onLeave={onLeave}
          anchorRef={ref}
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltip}
        />
      )}

      {/* Time badge */}
      <div style={{ height: 20, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(8,12,26,0.97)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '0 9px', boxShadow: '0 2px 10px rgba(0,0,0,0.6)', zIndex: 2 }}>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span style={{ color: '#e2e8f0', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(occupant.sittingAt)}</span>
        {isMine && <span style={{ width: 5, height: 5, borderRadius: '50%', background: occupant.avatarColor, display: 'inline-block', boxShadow: `0 0 5px ${occupant.avatarColor}` }} />}
      </div>

      {/* Character — rotated to face the table */}
      <div style={{ marginTop: 1, position: 'relative', transition: 'transform 0.2s', transform: `rotate(${rot}deg)${hov ? ' scale(1.06)' : ''}` }}>
        <SeatedCharacterSVG color={occupant.avatarColor} size={44} userId={occupant.userId} />
      </div>

      {/* Name tag */}
      <div style={{ height: 17, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(8,12,26,0.95)', border: `1px solid ${occupant.avatarColor}55`, borderRadius: 20, padding: '0 8px', maxWidth: CARD_W - 4, overflow: 'hidden', boxShadow: `0 0 8px ${occupant.avatarColor}22`, flexShrink: 0, zIndex: 2 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: occupant.avatarColor, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: '#cbd5e1', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{occupant.userName}</span>
      </div>
    </div>
  )
}

// ── Empty seat ────────────────────────────────────────────────────
function EmptySeat({ seatId, canSit, onSit }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{width:CARD_W,height:CARD_H,display:'flex',alignItems:'center',justifyContent:'center'}}>
      {canSit ? (
        <button onClick={()=>onSit(seatId)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} title="Sentar aqui"
          style={{width:44,height:44,borderRadius:'50%',background:hov?'rgba(124,58,237,0.12)':'rgba(8,12,26,0.8)',border:`2px dashed ${hov?'#7c3aed':'rgba(99,102,241,0.2)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.18s',transform:hov?'scale(1.12)':'scale(1)'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hov?'#a78bfa':'rgba(99,102,241,0.4)'} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      ) : (
        <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(8,12,26,0.5)',border:'2px dashed rgba(99,102,241,0.1)'}}/>
      )}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────
function Table({ tableNum, seats, mySeatId, subjects, hiddenSeats, onSit, onUpdate, onLeave }) {
  const alreadySitting = mySeatId !== null
  return (
    <div style={{position:'relative',width:WRAP_W,height:WRAP_H,flexShrink:0}}>
      <div style={{position:'absolute',top:CARD_H+GAP,left:CARD_W+GAP,width:TABLE_W,height:TABLE_H,background:'linear-gradient(160deg,#1b2338 0%,#131926 100%)',borderRadius:14,boxShadow:'0 8px 0 #07090f,0 16px 50px rgba(0,0,0,0.85),inset 0 1px 0 rgba(99,102,241,0.15)'}}>
        <div style={{position:'absolute',inset:0,borderRadius:14,background:'radial-gradient(ellipse at 50% 0%,rgba(99,102,241,0.07) 0%,transparent 70%)'}}/>
        <span style={{position:'absolute',top:8,left:12,fontSize:11,fontWeight:700,color:'rgba(99,102,241,0.35)',letterSpacing:'0.18em',userSelect:'none'}}>{String(tableNum).padStart(2,'0')}</span>
        <div style={{position:'absolute',bottom:10,right:14,opacity:0.9}}><DeskLampSVG/></div>
        <TableItems/>
      </div>
      {Object.entries(SEAT_POS).map(([pos,{top,left}])=>{
        const seatId   = `T${tableNum}_${pos}`
        const occupant = seats[seatId] ?? null
        const isMine   = seatId === mySeatId
        const hidden   = hiddenSeats.has(seatId)
        return (
          <div key={pos} style={{position:'absolute',top,left}}>
            {occupant
              ? <OccupiedCard occupant={occupant} isMine={isMine} subjects={subjects} onUpdate={onUpdate} onLeave={onLeave} hidden={hidden} direction={pos}/>
              : <EmptySeat seatId={seatId} canSit={!alreadySitting} onSit={onSit}/>
            }
          </div>
        )
      })}
    </div>
  )
}

// ── Save-session modal (shown when leaving the room) ──────────────
function SaveSessionModal({ mySeat, subjects, onSave, onDiscard }) {
  const sittingAt  = mySeat?.sittingAt
  const elapsedMin = sittingAt
    ? Math.max(1, Math.floor((Date.now() - new Date(sittingAt).getTime()) / 60000))
    : 1

  const initialSubject = subjects.find(s => s.name === mySeat?.subjectName)
  const [subjectId,      setSubjectId]      = useState(initialSubject?.id?.toString() || '')
  const [content,        setContent]        = useState('')
  const [correctAnswers, setCorrectAnswers] = useState('')
  const [wrongAnswers,   setWrongAnswers]   = useState('')
  const [saving,         setSaving]         = useState(false)

  const fmtTime = (m) => m >= 60
    ? `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}min` : ''}`
    : `${m}min`

  const handleSave = async () => {
    if (!subjectId || saving) return
    setSaving(true)
    try {
      await onSave({
        subjectId:      +subjectId,
        content:        content        || null,
        correctAnswers: correctAnswers ? +correctAnswers : null,
        wrongAnswers:   wrongAnswers   ? +wrongAnswers   : null,
      })
    } finally { setSaving(false) }
  }

  const fieldBase = {
    background: '#080d1a',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 10,
    padding: '10px 13px',
    fontSize: 13,
    color: '#a5b4fc',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }

  const total = correctAnswers && wrongAnswers
    ? +correctAnswers + +wrongAnswers : null
  const pct = total && total > 0
    ? Math.round((+correctAnswers / total) * 100) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div style={{
        background: 'linear-gradient(160deg, #0f1629 0%, #0a0d1a 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 24,
        width: 400,
        maxWidth: '94vw',
        boxShadow: '0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(99,102,241,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(99,102,241,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Registrar sessão
              </h3>
              <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>
                Salve o que você estudou antes de sair
              </p>
            </div>
            {/* Time badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 20, padding: '6px 12px', flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ color: '#f59e0b', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {fmtTime(elapsedMin)}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Disciplina */}
          <div>
            <label style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
              DISCIPLINA
              <span style={{ color: '#334155', fontWeight: 400, marginLeft: 5 }}>obrigatório</span>
            </label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              autoFocus
              className="rounded-xl transition-colors"
              style={{ ...fieldBase, color: subjectId ? '#a5b4fc' : '#334155' }}
            >
              <option value="">Selecione a disciplina...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* O que estudou */}
          <div>
            <label style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
              O QUE ESTUDOU
              <span style={{ color: '#334155', fontWeight: 400, marginLeft: 5 }}>opcional</span>
            </label>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Ex: Lei 8.112, capítulo 3..."
              style={fieldBase}
            />
          </div>

          {/* Acertos / Erros */}
          <div>
            <label style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
              QUESTÕES
              <span style={{ color: '#334155', fontWeight: 400, marginLeft: 5 }}>opcional</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                  color: '#22c55e', fontSize: 14, fontWeight: 800, pointerEvents: 'none', lineHeight: 1,
                }}>✓</span>
                <input
                  type="number" min={0}
                  value={correctAnswers}
                  onChange={e => setCorrectAnswers(e.target.value)}
                  placeholder="Acertos"
                  style={{ ...fieldBase, paddingLeft: 30, color: correctAnswers ? '#22c55e' : '#334155' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                  color: '#ef4444', fontSize: 14, fontWeight: 800, pointerEvents: 'none', lineHeight: 1,
                }}>✗</span>
                <input
                  type="number" min={0}
                  value={wrongAnswers}
                  onChange={e => setWrongAnswers(e.target.value)}
                  placeholder="Erros"
                  style={{ ...fieldBase, paddingLeft: 30, color: wrongAnswers ? '#ef4444' : '#334155' }}
                />
              </div>
            </div>

            {/* Aproveitamento em tempo real */}
            {pct !== null && (
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.14)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(99,102,241,0.12)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${pct}%`,
                    background: pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
                    transition: 'width 0.3s ease, background 0.3s',
                  }} />
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 800, flexShrink: 0,
                  color: pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
                }}>
                  {pct}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Buttons */}
        <div style={{
          padding: '0 24px 24px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <button
            onClick={handleSave}
            disabled={!subjectId || saving}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 14,
              border: 'none', cursor: !subjectId || saving ? 'not-allowed' : 'pointer',
              background: !subjectId || saving ? 'rgba(124,58,237,0.2)' : '#7c3aed',
              color: !subjectId || saving ? 'rgba(167,139,250,0.35)' : 'white',
              fontSize: 14, fontWeight: 800, letterSpacing: '0.01em',
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar e sair da mesa'}
          </button>
          <button
            onClick={onDiscard}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 14,
              background: 'transparent',
              border: '1px solid rgba(255,100,100,0.15)',
              color: '#7c5050', fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,100,100,0.15)'; e.currentTarget.style.color = '#7c5050' }}
          >
            Sair sem salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sit modal ─────────────────────────────────────────────────────
function SitModal({ open, subjects, onConfirm, onClose }) {
  const [sel,setSel]=useState('')
  const [status,setStatus]=useState('')
  const [custom,setCustom]=useState('')
  if (!open) return null
  const statusVal = status==='__custom__'?custom:status
  const confirm = () => { onConfirm(subjects.find(s=>s.id===+sel)?.name??null,statusVal||null); setSel('');setStatus('');setCustom('') }
  const iStyle = {width:'100%',background:'#080d1a',border:'1px solid rgba(99,102,241,0.2)',borderRadius:10,padding:'10px 12px',fontSize:14,color:'#a5b4fc',outline:'none',fontFamily:'inherit'}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div style={{background:'linear-gradient(160deg,#0f1629 0%,#0a0d1a 100%)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:24,width:400,maxWidth:'94vw',boxShadow:'0 32px 80px rgba(0,0,0,0.9),inset 0 1px 0 rgba(99,102,241,0.1)',overflow:'hidden'}}>
        <div style={{padding:'24px 24px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(99,102,241,0.04)'}}>
          <h3 style={{color:'#e2e8f0',fontSize:17,fontWeight:800,margin:0,letterSpacing:'-0.01em'}}>Sentar na mesa</h3>
          <p style={{color:'#64748b',fontSize:12,margin:'4px 0 0'}}>O que você vai estudar hoje?</p>
        </div>
        <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{color:'#64748b',fontSize:11,fontWeight:700,letterSpacing:'0.06em',display:'block',marginBottom:7}}>
              DISCIPLINA <span style={{color:'#334155',fontWeight:400}}>opcional</span>
            </label>
            <select value={sel} onChange={e=>setSel(e.target.value)} autoFocus style={iStyle}>
              <option value="">Sem matéria específica</option>
              {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{color:'#64748b',fontSize:11,fontWeight:700,letterSpacing:'0.06em',display:'block',marginBottom:8}}>
              ATIVIDADE <span style={{color:'#334155',fontWeight:400}}>opcional</span>
            </label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {STATUS_PRESETS.map(p=>(
                <button key={p} type="button" onClick={()=>{setStatus(p);setCustom('')}}
                  style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all 0.12s',
                    background:status===p?'rgba(124,58,237,0.2)':'rgba(255,255,255,0.04)',
                    color:status===p?'#a78bfa':'#64748b',
                    border:status===p?'1px solid rgba(124,58,237,0.4)':'1px solid rgba(255,255,255,0.08)'}}>
                  {p}
                </button>
              ))}
            </div>
            <input placeholder="Ou escreva aqui..." value={status==='__custom__'?custom:''} onChange={e=>{setStatus('__custom__');setCustom(e.target.value)}} onFocus={()=>setStatus('__custom__')} style={iStyle}/>
          </div>
        </div>
        <div style={{padding:'0 24px 24px',display:'flex',gap:10}}>
          <button onClick={confirm} style={{flex:1,padding:'12px 0',borderRadius:14,border:'none',cursor:'pointer',background:'#7c3aed',color:'white',fontSize:14,fontWeight:800,transition:'all 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#6d28d9'}
            onMouseLeave={e=>e.currentTarget.style.background='#7c3aed'}>
            Sentar
          </button>
          <button onClick={onClose} style={{flex:1,padding:'12px 0',borderRadius:14,cursor:'pointer',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#64748b',fontSize:14,fontWeight:600}}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function StudyRoom() {
  const { user }   = useAuth()
  const { roomState, connected, mySeatId, sit, updateSeat, leave, chatMessages, sendMessage } = useStudyRoom()
  const { ambientMode, cycleAmbient } = useAmbientSound()
  const [subjects,     setSubjects]  = useState([])
  const [pendingSeat,  setPending]   = useState(null)
  const [showLeave,    setShowLeave] = useState(false)
  const [, setTick] = useState(0)
  const [sidebarTab,   setSidebarTab] = useState('estudantes') // 'estudantes' | 'chat'
  const [chatInput,    setChatInput]  = useState('')
  const chatBottomRef   = useRef(null)
  const roomContainerRef = useRef(null)
  const [roomScale, setRoomScale] = useState(1)

  // Session timer state
  const [showSessionPicker, setShowSessionPicker] = useState(false)
  const [showFocusPicker,   setShowFocusPicker]   = useState(false)
  const [showSessionEnd,    setShowSessionEnd]     = useState(false)
  const [showBreakEnd,      setShowBreakEnd]       = useState(false)
  const [sessionType,       setSessionType]        = useState(null)   // 'free' | 'pomodoro' | null
  const [sessionPhase,      setSessionPhase]       = useState('idle') // 'idle' | 'focus' | 'break'
  const [focusDone,         setFocusDone]          = useState(25)
  const [breakDone,         setBreakDone]          = useState(5)
  const [timerSeconds,      setTimerSeconds]       = useState(0)
  const [paused,            setPaused]             = useState(false)
  const [pomodoroCount,     setPomodoroCount]      = useState(0)

  // Entry animation state
  const [enteringSeats, setEnteringSeats] = useState({}) // { seatId: occupant }
  const [hiddenSeats,   setHiddenSeats]   = useState(new Set())
  const prevSeatsRef   = useRef({})
  const liveRef        = useRef(false) // ignore initial load burst

  // Inject walk animation CSS once
  useEffect(() => {
    const s = document.createElement('style')
    s.id = 'study-room-anim'
    s.textContent = `
      @keyframes walkBob {
        0%,100% { transform: translateY(0px) rotate(-2deg); }
        25%      { transform: translateY(-5px) rotate(0deg); }
        50%      { transform: translateY(-2px) rotate(2deg); }
        75%      { transform: translateY(-5px) rotate(0deg); }
      }
      @keyframes sitDown {
        0%   { opacity:0; transform:translateY(-12px) scale(0.9); }
        65%  { transform:translateY(2px) scale(1.03); }
        100% { opacity:1; transform:translateY(0) scale(1); }
      }
      .walk-anim { animation: walkBob 0.36s ease-in-out infinite; }
      .sit-anim  { animation: sitDown 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    `
    document.head.appendChild(s)
    return () => { try { document.head.removeChild(s) } catch {} }
  }, [])

  useEffect(() => { subjectApi.getAll().then(setSubjects).catch(()=>{}) }, [])
  useEffect(() => { const id = setInterval(()=>setTick(t=>t+1), 15000); return ()=>clearInterval(id) }, [])

  // Timer tick
  useEffect(() => {
    if (sessionPhase === 'idle' || !sessionType || paused) return
    const id = setInterval(() => {
      setTimerSeconds(t => {
        if (sessionType === 'free') return t + 1
        return t > 0 ? t - 1 : 0
      })
    }, 1000)
    return () => clearInterval(id)
  }, [sessionPhase, sessionType, paused])

  // Detect pomodoro phase end (timer reached 0 while running)
  useEffect(() => {
    if (timerSeconds !== 0 || sessionPhase === 'idle' || sessionType !== 'pomodoro') return
    playBeep()
    const endedPhase = sessionPhase
    setSessionPhase('idle')
    if (endedPhase === 'focus') {
      setPomodoroCount(c => c + 1)
      setShowSessionEnd(true)
    } else {
      setShowBreakEnd(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds])

  // Go live 1.2 s after connection so initial occupants don't animate
  useEffect(() => {
    if (!connected) return
    const t = setTimeout(() => { liveRef.current = true }, 1200)
    return () => clearTimeout(t)
  }, [connected])

  // Detect new occupants and trigger entry animation
  useEffect(() => {
    const prev = prevSeatsRef.current
    const curr = roomState.seats
    if (liveRef.current) {
      Object.entries(curr).forEach(([seatId, occupant]) => {
        if (!prev[seatId]) {
          setEnteringSeats(e => ({ ...e, [seatId]: occupant }))
          setHiddenSeats(h => new Set([...h, seatId]))
        }
      })
    }
    prevSeatsRef.current = { ...curr }
  }, [roomState.seats])

  const handleAnimDone = useCallback((seatId) => {
    setEnteringSeats(e => { const n={...e}; delete n[seatId]; return n })
    setHiddenSeats(h => { const n=new Set(h); n.delete(seatId); return n })
  }, [])

  const resetSession = useCallback(() => {
    setShowSessionPicker(false); setShowFocusPicker(false)
    setShowSessionEnd(false);    setShowBreakEnd(false)
    setSessionType(null);        setSessionPhase('idle')
    setTimerSeconds(0);          setPaused(false)
    setPomodoroCount(0)
  }, [])

  const handleConfirm = useCallback((subjectName, status) => {
    if (pendingSeat) {
      sit(pendingSeat, subjectName, status)
      setShowSessionPicker(true)
    }
    setPending(null)
  }, [pendingSeat, sit])

  const handleSessionFree = useCallback(() => {
    setShowSessionPicker(false)
    setSessionType('free'); setSessionPhase('focus'); setTimerSeconds(0)
  }, [])

  const handleSessionPomodoro = useCallback(() => {
    setShowSessionPicker(false); setShowFocusPicker(true)
  }, [])

  const handleSessionSkip = useCallback(() => setShowSessionPicker(false), [])

  const handleFocusStart = useCallback((minutes) => {
    setShowFocusPicker(false); setFocusDone(minutes)
    setSessionType('pomodoro'); setSessionPhase('focus')
    setTimerSeconds(minutes * 60); setPaused(false)
  }, [])

  const handleFocusBack = useCallback(() => {
    setShowFocusPicker(false); setShowSessionPicker(true)
  }, [])

  const handleBreakStart = useCallback((minutes) => {
    setShowSessionEnd(false); setBreakDone(minutes)
    setSessionPhase('break'); setTimerSeconds(minutes * 60); setPaused(false)
  }, [])

  const handleSkipBreak = useCallback(() => {
    setShowSessionEnd(false); setShowFocusPicker(true)
  }, [])

  const handleBreakEndNewSession = useCallback(() => {
    setShowBreakEnd(false); setShowFocusPicker(true)
  }, [])

  const handlePause = useCallback(() => setPaused(p => !p), [])

  // Leave flow — always go through the save modal
  const handleLeaveRequest = useCallback(() => setShowLeave(true), [])

  const handleLeaveSave = useCallback(async ({ subjectId, content, correctAnswers, wrongAnswers }) => {
    const mySeat    = mySeatId ? roomState.seats[mySeatId] : null
    const sittingAt = mySeat?.sittingAt
    const duration  = sittingAt ? Math.max(1, Math.floor((Date.now() - new Date(sittingAt).getTime()) / 60000)) : 1
    await sessionApi.create({
      subject: { id: subjectId },
      startedAt: sittingAt ? new Date(sittingAt).toISOString().slice(0, 19) : new Date(Date.now() - duration * 60000).toISOString().slice(0, 19),
      duration,
      content:        content        ?? null,
      correctAnswers: correctAnswers ?? null,
      wrongAnswers:   wrongAnswers   ?? null,
    })
    window.dispatchEvent(new Event('sessionSaved'))
    leave()
    setShowLeave(false)
    resetSession()
  }, [mySeatId, roomState.seats, leave, resetSession])

  const handleLeaveDiscard = useCallback(() => {
    leave()
    setShowLeave(false)
    resetSession()
  }, [leave, resetSession])

  const occupants = Object.values(roomState.seats)

  useEffect(() => {
    if (sidebarTab === 'chat') chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, sidebarTab])

  const handleChatSend = useCallback(() => {
    const t = chatInput.trim()
    if (!t || !connected) return
    sendMessage(t)
    setChatInput('')
  }, [chatInput, connected, sendMessage])

  const handleChatKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() }
  }, [handleChatSend])

  // Scale the room to always fit the container without scrolling
  useEffect(() => {
    const ROOM_NAT_W = 2 * ROOM_PAD_SIDE + 2 * WRAP_W + 24
    const ROOM_NAT_H = ROOM_PAD_TOP + 2 * WRAP_H + 24 + 24
    const update = () => {
      if (!roomContainerRef.current) return
      const { width, height } = roomContainerRef.current.getBoundingClientRect()
      const sx = (width  - 24) / ROOM_NAT_W
      const sy = (height - 24) / ROOM_NAT_H
      setRoomScale(Math.min(1, sx, sy))
    }
    update()
    const ro = new ResizeObserver(update)
    if (roomContainerRef.current) ro.observe(roomContainerRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{background:'#080d1a'}}>
      <SitModal open={!!pendingSeat} subjects={subjects} onConfirm={handleConfirm} onClose={()=>setPending(null)}/>
      {showLeave && mySeatId && (
        <SaveSessionModal
          mySeat={roomState.seats[mySeatId]}
          subjects={subjects}
          onSave={handleLeaveSave}
          onDiscard={handleLeaveDiscard}
        />
      )}
      {showSessionPicker && (
        <SessionPickerModal onFree={handleSessionFree} onPomodoro={handleSessionPomodoro} onSkip={handleSessionSkip}/>
      )}
      {showFocusPicker && (
        <FocusDurationModal onStart={handleFocusStart} onBack={handleFocusBack}/>
      )}
      {showSessionEnd && (
        <SessionEndModal focusMin={focusDone} onBreak={handleBreakStart} onSkipBreak={handleSkipBreak} onLeave={handleLeaveRequest}/>
      )}
      {showBreakEnd && (
        <BreakEndModal breakMin={breakDone} onNewSession={handleBreakEndNewSession} onLeave={handleLeaveRequest}/>
      )}
      {mySeatId && sessionType && (
        <SessionBar sessionType={sessionType} phase={sessionPhase} seconds={timerSeconds}
          paused={paused} count={pomodoroCount} onPause={handlePause} onLeave={handleLeaveRequest}/>
      )}

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(8,13,26,0.97)'}} className="flex items-center justify-between px-7 py-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{color:'#e2e8f0'}}>Sala de Estudos</h1>
          <p className="text-xs mt-0.5" style={{color:'#475569'}}>Passe o mouse em um personagem para ver detalhes</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cycleAmbient} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:ambientMode.id!=='off'?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',border:ambientMode.id!=='off'?'1px solid rgba(99,102,241,0.28)':'1px solid rgba(255,255,255,0.07)',color:ambientMode.id!=='off'?'#818cf8':'#475569',fontSize:11,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>
            <span style={{fontSize:13}}>{ambientMode.icon}</span>
            <span>{ambientMode.label}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected?'bg-emerald-500 animate-pulse':'bg-stone-700'}`}/>
            <span className="text-xs" style={{color:'#475569'}}>{connected?'Ao vivo':'Conectando...'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Room */}
        <div ref={roomContainerRef} className="flex-1 overflow-hidden relative">
          <div className="relative rounded-3xl select-none" style={{
            background:'linear-gradient(180deg,#0d1022 0%,#090c18 100%)',
            border:'1px solid rgba(99,102,241,0.1)',
            boxShadow:'inset 0 1px 0 rgba(99,102,241,0.08),0 0 120px rgba(0,0,0,0.8)',
            padding:`${ROOM_PAD_TOP}px ${ROOM_PAD_SIDE}px ${ROOM_PAD_TOP}px`,
            overflow:'hidden',
            position:'absolute',
            top:'50%', left:'50%',
            transform:`translate(-50%,-50%) scale(${roomScale})`,
            transformOrigin:'center center',
          }}>
            {/* Floor grid */}
            <div style={{position:'absolute',inset:0,borderRadius:24,pointerEvents:'none',backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 63px,rgba(99,102,241,0.04) 63px,rgba(99,102,241,0.04) 64px),repeating-linear-gradient(90deg,transparent,transparent 127px,rgba(99,102,241,0.03) 127px,rgba(99,102,241,0.03) 128px)`}}/>
            {/* Center glow */}
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:2*WRAP_W+80,height:2*WRAP_H+80,borderRadius:40,pointerEvents:'none',background:'radial-gradient(ellipse at 50% 50%,rgba(124,58,237,0.08) 0%,transparent 60%)'}}/>
            {/* Warm ambient glow */}
            <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:'80%',height:60,pointerEvents:'none',background:'radial-gradient(ellipse at 50% 0%,rgba(245,158,11,0.06) 0%,transparent 80%)'}}/>
            {/* Corner vignettes */}
            <div style={{position:'absolute',inset:0,borderRadius:24,pointerEvents:'none',background:'radial-gradient(ellipse at 50% 50%,transparent 50%,rgba(0,0,0,0.3) 100%)'}}/>

            {/* Tables */}
            <div style={{display:'grid',gridTemplateColumns:`repeat(2,${WRAP_W}px)`,gap:24,position:'relative',zIndex:2}}>
              {[1,2,3,4].map(n=>(
                <Table key={n} tableNum={n} seats={roomState.seats} mySeatId={mySeatId}
                  subjects={subjects} hiddenSeats={hiddenSeats} onSit={setPending} onUpdate={updateSeat} onLeave={handleLeaveRequest}/>
              ))}
            </div>

            {/* Walking characters — on top of everything */}
            {Object.entries(enteringSeats).map(([seatId, occupant]) => (
              <WalkingCharacter
                key={seatId}
                seatId={seatId}
                occupant={occupant}
                onDone={() => handleAnimDone(seatId)}
              />
            ))}

          </div>
        </div>

        {/* Sidebar */}
        <aside style={{width:280,background:'#080d1a',borderLeft:'1px solid rgba(255,255,255,0.06)'}} className="flex-shrink-0 flex flex-col">
          {/* Tab bar */}
          <div style={{borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#080d1a'}} className="flex flex-shrink-0">
            {[{id:'estudantes',label:'Estudantes',badge:roomState.totalOnline||null},{id:'chat',label:'Chat',badge:null}].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                style={{
                  flex:1, padding:'11px 0', fontSize:12, fontWeight:700, cursor:'pointer',
                  background:'none', border:'none',
                  borderBottom: sidebarTab===tab.id ? '2px solid #7c3aed' : '2px solid transparent',
                  color: sidebarTab===tab.id ? '#e2e8f0' : '#475569',
                  transition:'all 0.15s',
                  letterSpacing:'0.04em',
                }}
              >
                {tab.label}
                {tab.id==='estudantes' && tab.badge > 0 && (
                  <span style={{marginLeft:5,background:'rgba(245,158,11,0.18)',color:'#f59e0b',fontSize:10,padding:'1px 6px',borderRadius:10,fontWeight:800}}>
                    {tab.badge}
                  </span>
                )}
                {tab.id==='chat' && chatMessages.length>0 && sidebarTab!=='chat' && (
                  <span style={{marginLeft:5,background:'rgba(245,158,11,0.18)',color:'#f59e0b',fontSize:10,padding:'1px 6px',borderRadius:10,fontWeight:800}}>
                    {chatMessages.length > 99 ? '99+' : chatMessages.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Estudantes tab */}
          {sidebarTab === 'estudantes' && (
            <>
              <div className="flex-1 overflow-auto">
                {occupants.length===0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                    <div className="mb-3 opacity-20 flex justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{width:36,height:36}}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
                    <p className="text-sm" style={{color:'#475569'}}>Ninguém estudando ainda.</p>
                    <p className="text-xs mt-1" style={{color:'#334155'}}>Seja o primeiro a sentar!</p>
                  </div>
                ) : (
                  <ul className="divide-y" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                    {occupants.map((occ,idx)=>{
                      return (
                        <li key={idx} className="flex items-start gap-3 px-4 py-3.5">
                          <div style={{flexShrink:0,marginTop:2}}>
                            {occ.avatarData ? (
                              <img src={occ.avatarData} alt={occ.userName} style={{width:36,height:36,borderRadius:10,objectFit:'cover',border:`2px solid ${occ.avatarColor}55`}}/>
                            ) : (
                              <CharacterSVG color={occ.avatarColor} size={34} userId={occ.userId}/>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold truncate" style={{color:'#e2e8f0'}}>
                                {occ.userName}
                              </p>
                              {occ.userId===user?.id && <span className="text-[10px] font-normal" style={{color:occ.avatarColor}}>(você)</span>}
                              {occ.estado && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background:'rgba(99,102,241,0.1)',color:'#818cf8'}}>{occ.estado}</span>}
                            </div>
                            {occ.status && <p className="text-xs italic truncate mt-0.5" style={{color:'#64748b'}}>{occ.status}</p>}
                            {(occ.concurso || occ.examName) && <p className="text-[11px] truncate mt-0.5 font-medium" style={{color:occ.avatarColor}}>{occ.concurso || occ.examName}</p>}
                            {occ.subjectName && <p className="text-[11px] truncate" style={{color:'#475569'}}>{occ.subjectName}</p>}
                            <div className="flex items-center gap-1 mt-1.5">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={occ.avatarColor} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              <span className="text-xs font-bold tabular-nums" style={{color:occ.avatarColor}}>{formatElapsed(occ.sittingAt)}</span>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              {mySeatId && (
                <div style={{borderTop:'1px solid rgba(255,255,255,0.06)'}} className="px-5 py-4 flex-shrink-0">
                  <button onClick={handleLeaveRequest} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95" style={{border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.08)',color:'#f87171'}}>Levantar da mesa</button>
                </div>
              )}
              {!mySeatId && connected && (
                <div style={{borderTop:'1px solid rgba(255,255,255,0.06)'}} className="px-5 py-4 flex-shrink-0">
                  <p className="text-xs leading-relaxed" style={{color:'#475569'}}>Clique em uma cadeira para sentar e estudar ao lado de outros.</p>
                </div>
              )}
            </>
          )}

          {/* Chat tab */}
          {sidebarTab === 'chat' && (
            <>
              <div className="flex-1 overflow-auto px-3 py-3" style={{display:'flex',flexDirection:'column',gap:6}}>
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                    <div className="mb-3 opacity-20 flex justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{width:36,height:36}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                    <p className="text-sm" style={{color:'#475569'}}>Sem mensagens ainda.</p>
                    <p className="text-xs mt-1" style={{color:'#334155'}}>Seja o primeiro a dizer oi!</p>
                  </div>
                ) : chatMessages.map((msg, idx) => {
                  const isMe = msg.userId === user?.id
                  const timeStr = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
                  const prev = chatMessages[idx - 1]
                  const showName = !prev || prev.userId !== msg.userId
                  return (
                    <div key={idx} style={{display:'flex',flexDirection:'column',alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                      {showName && (
                        <span style={{fontSize:10,fontWeight:700,color: isMe ? '#a78bfa' : '#94a3b8',marginBottom:2,paddingLeft: isMe ? 0 : 4,paddingRight: isMe ? 4 : 0}}>
                          {isMe ? 'Você' : msg.userName}
                        </span>
                      )}
                      <div style={{
                        maxWidth:'88%',
                        background: isMe ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
                        border: isMe ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding:'7px 11px',
                      }}>
                        <p style={{fontSize:13,color:'#cbd5e1',lineHeight:1.45,wordBreak:'break-word',margin:0}}>{msg.text}</p>
                      </div>
                      <span style={{fontSize:10,color:'#334155',marginTop:2,paddingLeft: isMe ? 0 : 4,paddingRight: isMe ? 4 : 0}}>{timeStr}</span>
                    </div>
                  )
                })}
                <div ref={chatBottomRef}/>
              </div>
              <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'10px 12px',flexShrink:0,display:'flex',gap:7,alignItems:'flex-end'}}>
                <textarea
                  rows={1}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKey}
                  placeholder={connected ? 'Mensagem...' : 'Conectando...'}
                  disabled={!connected}
                  style={{
                    flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                    borderRadius:12, padding:'8px 11px', fontSize:13, color:'#cbd5e1',
                    outline:'none', resize:'none', lineHeight:1.4,
                    fontFamily:'inherit', maxHeight:80, overflowY:'auto',
                    opacity: connected ? 1 : 0.4,
                  }}
                />
                <button
                  onClick={handleChatSend}
                  disabled={!connected || !chatInput.trim()}
                  style={{
                    width:36, height:36, borderRadius:12, border:'none', cursor:'pointer',
                    background: connected && chatInput.trim() ? 'rgba(124,58,237,0.8)' : 'rgba(255,255,255,0.05)',
                    color: connected && chatInput.trim() ? 'white' : '#334155',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0, transition:'all 0.15s', fontSize:15,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
