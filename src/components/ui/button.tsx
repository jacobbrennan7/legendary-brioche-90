
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'outline'|'secondary'|'destructive' }
export function Button({ className = '', variant, ...props }: Props) {
  const base = 'inline-flex items-center rounded-2xl px-3 py-2 text-sm font-medium shadow-sm transition'
  const styles: Record<string,string> = {
    default: 'bg-black text-white hover:bg-neutral-800',
    outline: 'border hover:bg-neutral-50',
    secondary: 'bg-neutral-100 hover:bg-neutral-200',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  }
  const style = variant ? styles[variant] : styles.default
  return <button className={`${base} ${style} ${className}`} {...props} />
}
