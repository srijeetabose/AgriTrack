import { useNavigate } from 'react-router-dom'
import { ChevronRight, Thermometer, Fuel, Gauge } from 'lucide-react'
import type { Machine } from '../lib/api'
import './MachineCard.css'

interface MachineCardProps {
  machine: Machine
}

export default function MachineCard({ machine }: MachineCardProps) {
  const navigate = useNavigate()
  
  const hasAlerts = machine.alerts && machine.alerts.length > 0

  return (
    <div 
      className={`machine-card ${hasAlerts ? 'has-alerts' : ''}`}
      onClick={() => navigate(`/machines/${machine.id}`)}
    >
      <div className="machine-header">
        <div className="machine-info">
          <span className="machine-icon">🚜</span>
          <div>
            <h3 className="machine-name">{machine.id}</h3>
            <p className="machine-type">{machine.type}</p>
          </div>
        </div>
        <div className="machine-right">
          <span className={`badge badge-${machine.state}`}>
            {machine.state}
          </span>
          <ChevronRight size={20} className="chevron" />
        </div>
      </div>

      <div className="machine-stats">
        <div className="stat">
          <Thermometer size={16} />
          <span>{machine.temp?.toFixed(1) || '--'}°C</span>
        </div>
        <div className="stat">
          <Fuel size={16} />
          <span>{machine.fuel?.toFixed(0) || '--'}%</span>
        </div>
        <div className="stat">
          <Gauge size={16} />
          <span>{machine.speed?.toFixed(1) || '--'} km/h</span>
        </div>
      </div>

      {hasAlerts && (
        <div className="machine-alerts">
          ⚠️ {machine.alerts.length} alert{machine.alerts.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
