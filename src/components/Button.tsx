import React from 'react'

type BtnVariant = 'primary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  children: React.ReactNode
}

const variantClass: Record<BtnVariant, string> = {
  primary: 'ch-btn-primary',
  ghost: 'ch-btn-ghost',
  danger: 'ch-btn-danger',
}

export default function Button({
  variant = 'ghost',
  size = 'sm',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ch-btn ${variantClass[variant]} ${size === 'sm' ? 'ch-btn-sm' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
