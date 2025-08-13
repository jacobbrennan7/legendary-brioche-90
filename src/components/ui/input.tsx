
import React from 'react'
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input className={`border rounded-2xl px-3 py-2 text-sm ${className}`} {...rest} />
}
