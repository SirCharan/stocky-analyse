import type { ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { useIsMobile } from '../lib/useIsMobile'

interface ChartWrapperProps {
  height?: number;
  mobileHeight?: number;
  children: ReactNode;
}

export default function ChartWrapper({ height = 300, mobileHeight, children }: ChartWrapperProps) {
  const mobile = useIsMobile()
  const h = mobile && mobileHeight ? mobileHeight : height
  return (
    <ResponsiveContainer width="100%" height={h}>
      {children as React.ReactElement}
    </ResponsiveContainer>
  )
}

export function DarkTooltipStyle() {
  return {
    contentStyle: {
      background: '#0f0f0f',
      border: '1px solid #252525',
      borderRadius: 8,
      fontSize: 12,
      color: '#e8e8e8',
    },
    itemStyle: { color: '#e8e8e8' },
    cursor: { fill: 'rgba(255,255,255,0.03)' },
  }
}
