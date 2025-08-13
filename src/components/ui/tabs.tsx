
import React, { createContext, useContext, useState } from 'react'

const Ctx = createContext<{value:string, set:(v:string)=>void} | null>(null)

export function Tabs({ defaultValue, children, className='' }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [value, setValue] = useState(defaultValue)
  return <div className={className}><Ctx.Provider value={{value, set:setValue}}>{children}</Ctx.Provider></div>
}
export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex gap-2 rounded-2xl border bg-white p-1">{children}</div>
}
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(Ctx)!
  const active = ctx.value === value
  return (
    <button
      onClick={()=>ctx.set(value)}
      className={`px-3 py-1.5 text-sm rounded-2xl ${active ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
    >{children}</button>
  )
}
export function TabsContent({ value, children, className='' }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(Ctx)!
  if (ctx.value !== value) return null
  return <div className={className}>{children}</div>
}
