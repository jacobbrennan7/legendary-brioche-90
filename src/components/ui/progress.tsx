
import React from 'react'
export function Progress({ value, className='' }: { value: number; className?: string }) {
  return (
    <div className={`w-full rounded-full bg-neutral-200 ${className}`}>
      <div className="h-full rounded-full bg-black" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
