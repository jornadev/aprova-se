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
  const [currentRoomId, setCurrentRoomId] = useState(null)
  const [roomState, setRoomState] = useState({ seats: {}, totalOnline: 0 })
  const [rooms, setRooms] = useState([])
  const [connected, setConnected] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const clientRef = useRef(null)
  const subsRef = useRef([])
  const recentSentRef = useRef([])

  const subscribeToRoom = useCallback((client, roomId) => {
    // Unsubscribe from previous room
    subsRef.current.forEach(s => { try { s.unsubscribe() } catch {} })
    subsRef.current = []

    const sub1 = client.subscribe(`/topic/study-room/${roomId}`, (msg) => {
      try { setRoomState(JSON.parse(msg.body)) } catch {}
    })

    const sub2 = client.subscribe(`/topic/study-room/${roomId}/chat`, (msg) => {
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

    const sub3 = client.subscribe('/topic/study-room/rooms', (msg) => {
      try { setRooms(JSON.parse(msg.body)) } catch {}
    })

    subsRef.current = [sub1, sub2, sub3]
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Fetch initial state to know which room to join
    api.get('/study-room').then(r => {
      const data = r.data
      const roomId = data.roomId || 1
      setCurrentRoomId(roomId)
      setRoomState(data.room || { seats: {}, totalOnline: 0 })
      setRooms(data.rooms || [])
    }).catch(() => {
      setCurrentRoomId(1)
    })
  }, [])

  useEffect(() => {
    if (currentRoomId == null) return
    const token = localStorage.getItem('token')
    if (!token) return

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      onConnect: () => {
        setConnected(true)
        subscribeToRoom(client, currentRoomId)
        // Fetch fresh state for the room
        api.get(`/study-room/${currentRoomId}`).then(r => setRoomState(r.data)).catch(() => {})
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => { console.error('[stomp error]', frame); setConnected(false) },
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate() }
  }, [currentRoomId, subscribeToRoom])

  const switchRoom = useCallback((roomId) => {
    if (roomId === currentRoomId) return
    setChatMessages([])
    setRoomState({ seats: {}, totalOnline: 0 })
    setCurrentRoomId(roomId)
  }, [currentRoomId])

  const sit = useCallback((seatId, subjectName, status) => {
    clientRef.current?.publish({
      destination: '/app/room.sit',
      body: JSON.stringify({ roomId: currentRoomId, seatId, subjectName: subjectName || null, status: status || null }),
    })
  }, [currentRoomId])

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

  return {
    currentRoomId, rooms, roomState, connected, mySeatId,
    sit, updateSeat, leave, switchRoom,
    chatMessages, sendMessage,
  }
}
