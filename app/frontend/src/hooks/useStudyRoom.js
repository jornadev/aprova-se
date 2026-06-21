import { useState, useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL || ''
const WS_URL = API_BASE
  ? API_BASE.replace(/\/api$/, '/ws')
  : `${window.location.protocol}//${window.location.hostname}:8080/ws`

export function useStudyRoom() {
  const { user } = useAuth()
  const [roomState, setRoomState] = useState({ seats: {}, totalOnline: 0 })
  const [connected, setConnected] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const clientRef = useRef(null)
  const recentSentRef = useRef([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/study-room', (msg) => {
          try { setRoomState(JSON.parse(msg.body)) } catch {}
        })
        client.subscribe('/topic/study-room/chat', (msg) => {
          try {
            const m = JSON.parse(msg.body)
            const now = Date.now()
            const idx = recentSentRef.current.findIndex(
              r => r.userId === m.userId && r.text === m.text && (now - r.at) < 10000
            )
            if (idx >= 0) {
              recentSentRef.current.splice(idx, 1)
              return
            }
            recentSentRef.current = recentSentRef.current.filter(r => (now - r.at) < 10000)
            setChatMessages(prev => [...prev.slice(-199), m])
          } catch (e) {
            console.error('[chat subscription error]', e)
          }
        })
        api.get('/study-room').then(r => setRoomState(r.data)).catch(() => {})
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => { console.error('[stomp error]', frame); setConnected(false) },
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate() }
  }, [])

  const sit = useCallback((seatId, subjectName, status) => {
    clientRef.current?.publish({
      destination: '/app/room.sit',
      body: JSON.stringify({ seatId, subjectName: subjectName || null, status: status || null }),
    })
  }, [])

  const updateSeat = useCallback((subjectName, status) => {
    clientRef.current?.publish({
      destination: '/app/room.update',
      body: JSON.stringify({ subjectName: subjectName || null, status: status || null }),
    })
  }, [])

  const leave = useCallback(() => {
    clientRef.current?.publish({ destination: '/app/room.leave', body: '{}' })
  }, [])

  const sendMessage = useCallback((text) => {
    if (!text?.trim() || !user) return
    const trimmed = text.trim()

    recentSentRef.current.push({ userId: user.id, text: trimmed, at: Date.now() })
    setChatMessages(prev => [...prev.slice(-199), {
      userId:    user.id,
      userName:  user.name,
      avatarColor: null,
      text:      trimmed,
      timestamp: new Date().toISOString(),
    }])

    clientRef.current?.publish({
      destination: '/app/room.chat',
      body: JSON.stringify({ text: trimmed }),
    })
  }, [user])

  const mySeatId = user
    ? Object.entries(roomState.seats).find(([, occ]) => occ.userId === user.id)?.[0] ?? null
    : null

  return { roomState, connected, mySeatId, sit, updateSeat, leave, chatMessages, sendMessage }
}
