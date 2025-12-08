'use client'

import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface MachineData {
  id: string
  temp: number
  vibration: { x: number; y: number; z: number }
  gps: { lat: number; lng: number }
  speed: number
  state: 'active' | 'idle' | 'off' | 'overheat'
  alerts: Array<{ type: string; message: string }>
  timestamp: number
}

export interface Stats {
  totalMachines: number
  activeMachines: number
  idleMachines: number
  offlineMachines: number
  alertCount: number
  overheatAlerts: number
  avgTemperature: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [machines, setMachines] = useState<Map<string, MachineData>>(new Map())
  const [stats, setStats] = useState<Stats>({
    totalMachines: 0,
    activeMachines: 0,
    idleMachines: 0,
    offlineMachines: 0,
    alertCount: 0,
    overheatAlerts: 0,
    avgTemperature: 0
  })

  useEffect(() => {
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket')
      setConnected(false)
    })

    newSocket.on('initial_state', (data: MachineData[]) => {
      console.log('📦 Received initial state:', data.length, 'machines')
      const newMachines = new Map<string, MachineData>()
      data.forEach(machine => {
        newMachines.set(machine.id, machine)
      })
      setMachines(newMachines)
      updateStats(newMachines)
    })

    newSocket.on('device_update', (data: MachineData) => {
      setMachines(prev => {
        const updated = new Map(prev)
        updated.set(data.id, data)
        updateStats(updated)
        return updated
      })
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const updateStats = useCallback((machineMap: Map<string, MachineData>) => {
    const machineArray = Array.from(machineMap.values())
    
    const newStats: Stats = {
      totalMachines: machineArray.length,
      activeMachines: machineArray.filter(m => m.state === 'active').length,
      idleMachines: machineArray.filter(m => m.state === 'idle').length,
      offlineMachines: machineArray.filter(m => m.state === 'off').length,
      alertCount: machineArray.reduce((sum, m) => sum + (m.alerts?.length || 0), 0),
      overheatAlerts: machineArray.filter(m => m.alerts?.some(a => a.type === 'overheat')).length,
      avgTemperature: machineArray.length > 0 
        ? Math.round(machineArray.reduce((sum, m) => sum + (m.temp || 0), 0) / machineArray.length)
        : 0
    }
    
    setStats(newStats)
  }, [])

  return {
    socket,
    connected,
    machines: Array.from(machines.values()),
    stats
  }
}
