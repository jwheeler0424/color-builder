import { useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import type { SavedPalette } from '../types'
import { useChromaStore } from '../useChromaStore'
import { hexToStop, loadSaved, deleteSaved, clearSaved, encodeUrl } from '../paletteUtils'
import Button from './shared/Button'

export default function SavedView() {
  const { loadPalette, openModal } = useChromaStore()
  const navigate = useNavigate()
  const [palettes, setPalettes] = useState<SavedPalette[]>([])

  const refresh = () => setPalettes(loadSaved())

  useEffect(() => { refresh() }, [])

  // Renamed to avoid collision with the store's loadPalette method
  const handleLoad = (p: SavedPalette) => {
    const slots = p.hexes.map(hex => ({ color: hexToStop(hex), locked: false }))
    loadPalette(slots, p.mode, p.hexes.length)
    navigate({ to: '/palette' })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this palette?')) return
    deleteSaved(id)
    refresh()
  }

  const handleClearAll = () => {
    if (!confirm('Clear all saved palettes?')) return
    clearSaved()
    refresh()
  }

  const handleShare = (p: SavedPalette) => {
    const url = encodeUrl(p.hexes, p.mode)
    navigator.clipboard.writeText(url).catch(() => {})
    openModal('share')
  }

  if (!palettes.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd"><h2>Saved Palettes</h2></div>
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ch-t3)' }}>
          <div style={{ fontFamily: 'var(--ch-fd)', fontSize: 18, fontWeight: 700, color: 'var(--ch-t2)', marginBottom: 8 }}>
            No saved palettes yet
          </div>
          <p style={{ fontSize: 12 }}>Generate a palette you love, then click ♡ to save it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--ch-fd)', fontSize: 20, fontWeight: 800 }}>Saved Palettes</h2>
          <Button variant="danger" size="sm" onClick={handleClearAll}>Clear All</Button>
        </div>
        <div className="ch-saved-grid">
          {palettes.map(p => (
            <div key={p.id} className="ch-saved-card">
              <div style={{ height: 44, display: 'flex' }}>
                {p.hexes.map((h, i) => <div key={i} style={{ flex: 1, background: h }} />)}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--ch-fd)', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                  {p.name || 'Unnamed'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ch-t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  {p.mode} · {p.hexes.length} colors
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <Button variant="ghost" size="sm" onClick={() => handleLoad(p)}>↓ Load</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleShare(p)}>⤴ Share</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>× Del</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
