import { useState } from 'react'
import { Search } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import { useLanguage } from '../context/LanguageContext'
import MachineCard from '../components/MachineCard'
import './MachinesPage.css'

type FilterState = 'all' | 'active' | 'idle' | 'off'

export default function MachinesPage() {
  const { machines, connected } = useSocket()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterState>('all')

  const allMachines = Array.from(machines.values())

  const stats = {
    all: allMachines.length,
    active: allMachines.filter(m => m.state === 'active').length,
    idle: allMachines.filter(m => m.state === 'idle').length,
    off: allMachines.filter(m => m.state === 'off').length,
  }

  let filteredList = allMachines

  if (filter !== 'all') {
    filteredList = filteredList.filter(machine => machine.state === filter)
  }

  if (search.trim()) {
    const searchLower = search.toLowerCase()
    filteredList = filteredList.filter(machine => 
      machine.id.toLowerCase().includes(searchLower) ||
      (machine.type && machine.type.toLowerCase().includes(searchLower))
    )
  }

  const getFilterLabel = (filterType: FilterState) => {
    switch (filterType) {
      case 'all': return t('all')
      case 'active': return t('active')
      case 'idle': return t('available')
      case 'off': return t('offline')
      default: return filterType
    }
  }

  return (
    <div className="machines-page">
      {/* Search Bar */}
      <div className="search-container">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder={t('searchMachines')}
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
          {getFilterLabel('all')} ({stats.all})
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          {getFilterLabel('active')} ({stats.active})
        </button>
        <button
          className={`filter-tab ${filter === 'idle' ? 'active' : ''}`}
          onClick={() => setFilter('idle')}
        >
          {getFilterLabel('idle')} ({stats.idle})
        </button>
        <button
          className={`filter-tab ${filter === 'off' ? 'active' : ''}`}
          onClick={() => setFilter('off')}
        >
          {getFilterLabel('off')} ({stats.off})
        </button>
      </div>

      {/* Machine List */}
      <div className="machine-list" key={`${filter}-${search}-${filteredList.length}`}>
        {!connected ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{t('connectingServer')}</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚜</div>
            <h3>{t('noMachinesFound')}</h3>
            <p>{t('adjustFilters')}</p>
          </div>
        ) : (
          filteredList.map(machine => (
            <MachineCard key={`${machine.id}-${filter}`} machine={machine} />
          ))
        )}
      </div>
    </div>
  )
}
