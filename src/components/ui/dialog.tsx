
import React, { createContext, useContext, useState } from 'react'

const Ctx = createContext<{open:boolean,set:(b:boolean)=>void}|null>(null)

export function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <Ctx.Provider value={{open, set:setOpen}}>{children}</Ctx.Provider>
}

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const ctx = useContext(Ctx)!
  const trigger = <button onClick={()=>ctx.set(true)}>{children}</button>
  return asChild ? <>{trigger}</> : trigger
}

export function DialogContent({ children, className='' }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(Ctx)!
  if (!ctx.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={()=>ctx.set(false)} />
      <div className={`relative z-10 w-[90%] max-w-lg rounded-2xl border bg-white p-4 ${className}`}>{children}</div>
    </div>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>
}
export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>
}
