import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface Machine {
  id: string
  type: string
  state: 'active' | 'idle' | 'off'
  lat: number
  lng: number
  temp: number
  fuel: number
  speed: number
  rpm: number
  vibration: number
  area: number
  alerts: Array<{ type: string; message: string }>
  timestamp: string
}

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  machines: Map<string, Machine>
  refreshMachines: () => Promise<void>
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  machines: new Map(),
  refreshMachines: async () => {}
})

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [machines, setMachines] = useState<Map<string, Machine>>(new Map())

  // Fetch machines via REST API as fallback
  const fetchMachinesREST = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/machines/realtime/all`)
      if (response.ok) {
        const data = await response.json()
        if (data && typeof data === 'object') {
          setMachines(new Map(Object.entries(data)))
          setConnected(true)
          console.log('📦 Fetched machines via REST:', Object.keys(data).length)
        }
      }
    } catch (error) {
      console.log('REST fetch error:', error)
    }
  }

  const refreshMachines = async () => {
    await fetchMachinesREST()
  }

  useEffect(() => {
    // First fetch via REST API immediately
    fetchMachinesREST()

    // Then try socket connection
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    })

    newSocket.on('connect', () => {
      console.log('🔌 Connected to server')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from server')
    })

    newSocket.on('initial_state', (data: Record<string, Machine>) => {
      console.log('📦 Received initial state:', Object.keys(data).length, 'machines')
      setMachines(new Map(Object.entries(data)))
    })

    newSocket.on('device_update', (machine: Machine) => {
      setMachines(prev => {
        const updated = new Map(prev)
        updated.set(machine.id, machine)
        return updated
      })
    })

    setSocket(newSocket)

    // Refresh every 30 seconds as backup
    const interval = setInterval(fetchMachinesREST, 30000)

    return () => {
      newSocket.close()
      clearInterval(interval)
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, connected, machines, refreshMachines }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
