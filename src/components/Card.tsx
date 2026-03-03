import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn('card', className)}>
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  )
}
