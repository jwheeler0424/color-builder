import React, { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export default function Modal({ title, onClose, children, footer, width = 480 }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="ch-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ch-modal" style={{ width, maxWidth: '96vw' }}>
        <div className="ch-modal-hd">
          <h2>{title}</h2>
          <button className="ch-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ch-modal-bd">{children}</div>
        {footer && <div className="ch-modal-ft">{footer}</div>}
      </div>
    </div>
  )
}
