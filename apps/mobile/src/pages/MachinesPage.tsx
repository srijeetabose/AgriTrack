import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import MachineCard from '../components/MachineCard'
import './MachinesPage.css'

type FilterState = 'all' | 'active' | 'idle' | 'off'

export default function MachinesPage() {
  const { machines, connected } = useSocket()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterState>('all')

  const filteredMachines = useMemo(() => {
    return Array.from(machines.values()).filter(machine => {
      // Filter by state
      if (filter !== 'all' && machine.state !== filter) return false
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          machine.id.toLowerCase().includes(searchLower) ||
          machine.type.toLowerCase().includes(searchLower)
        )
      }
      
      return true
    })
  }, [machines, filter, search])

  const stats = useMemo(() => ({
    all: machines.size,
    active: Array.from(machines.values()).filter(m => m.state === 'active').length,
    idle: Array.from(machines.values()).filter(m => m.state === 'idle').length,
    off: Array.from(machines.values()).filter(m => m.state === 'off').length,
  }), [machines])

  return (
    <div className="machines-page">
      {/* Search Bar */}
      <div className="search-container">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search machines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({stats.all})
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({stats.active})
        </button>
        <button
          className={`filter-tab ${filter === 'idle' ? 'active' : ''}`}
          onClick={() => setFilter('idle')}
        >
          Available ({stats.idle})
        </button>
        <button
          className={`filter-tab ${filter === 'off' ? 'active' : ''}`}
          onClick={() => setFilter('off')}
        >
          Offline ({stats.off})
        </button>
      </div>

      {/* Machine List */}
      <div className="machine-list">
        {!connected ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Connecting to server...</p>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚜</div>
            <h3>No machines found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredMachines.map(machine => (
            <MachineCard key={machine.id} machine={machine} />
          ))
        )}
      </div>
    </div>
  )
}
