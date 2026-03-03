import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  subtext?: string;
  icon?: ReactNode;
  accentColor?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  subtext,
  accentColor,
  className,
}: StatCardProps) {
  const trendColor = trendDirection === 'up' ? 'text-green-500' : trendDirection === 'down' ? 'text-red-500' : 'text-gray-500'

  return (
    <div className={cn('stat-card', className)}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accentColor ? { color: accentColor } : undefined}>
        {value}
      </div>
      {trend && (
        <div className={cn('stat-trend', trendColor)}>{trend}</div>
      )}
      {subtext && (
        <div className="text-xs text-text-muted mt-1">{subtext}</div>
      )}
    </div>
  )
}
