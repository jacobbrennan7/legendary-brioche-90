
import React from 'react'

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>
}
export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>
}
