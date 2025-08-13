
import React from 'react'
export function Checkbox({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className="w-4 h-4 rounded border"
      checked={!!checked}
      onChange={(e)=>onCheckedChange?.(e.target.checked)}
    />
  )
}
