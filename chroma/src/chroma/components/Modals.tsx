import React, { useState, useMemo } from 'react'
import { useChromaStore } from '../useChromaStore'
import { encodeUrl, savePalette } from '../paletteUtils'
import { deriveThemeTokens, buildThemeCss, buildFigmaTokens, buildTailwindConfig } from '../colorMath'
import type { ExportTab } from '../types'
import Modal from './shared/Modal'
import Button from './shared/Button'

// ─── Export Modal ─────────────────────────────────────────────────────────────

const EXPORT_TABS: { id: ExportTab; label: string }[] = [
  { id: 'hex',      label: 'HEX' },
  { id: 'css',      label: 'CSS' },
  { id: 'array',    label: 'JS Array' },
  { id: 'scss',     label: 'SCSS' },
  { id: 'figma',    label: 'Figma' },
  { id: 'tailwind', label: 'Tailwind' },
]

export function ExportModal() {
  const { slots, utilityColors, exportTab, setExportTab, closeModal } = useChromaStore()
  const hexes = slots.map(s => s.color.hex)
  const [copied, setCopied] = useState(false)

  const tokens = useMemo(() => deriveThemeTokens(slots, utilityColors), [slots, utilityColors])

  const content = useMemo(() => {
    switch (exportTab) {
      case 'hex':      return hexes.join('\n')
      case 'css':      return `:root {\n${hexes.map((h, i) => `  --color-${i + 1}: ${h};`).join('\n')}\n}`
      case 'array':    return `const palette = [\n${hexes.map(h => `  '${h}'`).join(',\n')}\n];`
      case 'scss':     return hexes.map((h, i) => `$color-${i + 1}: ${h};`).join('\n')
      case 'figma':    return buildFigmaTokens(tokens, utilityColors)
      case 'tailwind': return buildTailwindConfig(tokens, utilityColors)
      default: return ''
    }
  }, [exportTab, hexes, tokens, utilityColors])

  const copy = () => {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Modal
      title="Export"
      onClose={closeModal}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Close</Button>
          <Button variant="primary" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {EXPORT_TABS.map(({ id, label }) => (
          <Button key={id} variant={exportTab === id ? 'primary' : 'ghost'} size="sm"
            onClick={() => setExportTab(id)}>
            {label}
          </Button>
        ))}
      </div>
      {exportTab === 'figma' && (
        <p style={{ fontSize: 11, color: 'var(--ch-t3)', marginBottom: 8 }}>
          Style Dictionary / Figma Tokens JSON — includes palette, semantic tokens, and utility colors.
        </p>
      )}
      {exportTab === 'tailwind' && (
        <p style={{ fontSize: 11, color: 'var(--ch-t3)', marginBottom: 8 }}>
          Tailwind config snippet — pair with CSS Variables output for full light/dark support.
        </p>
      )}
      <pre className="ch-expre">{content}</pre>
      <div style={{ display: 'flex', height: 24, borderRadius: 2, overflow: 'hidden', gap: 2, marginTop: 8 }}>
        {hexes.map((h, i) => <div key={i} style={{ flex: 1, background: h }} />)}
      </div>
    </Modal>
  )
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

export function ShareModal() {
  const { slots, mode, closeModal } = useChromaStore()
  const hexes = slots.map(s => s.color.hex)
  const url = encodeUrl(hexes, mode)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Modal title="Share Palette" onClose={closeModal}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Close</Button>
          <Button variant="primary" onClick={copy}>{copied ? '✓ Copied' : 'Copy URL'}</Button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: 'var(--ch-t3)', marginBottom: 10 }}>
        Anyone with this URL can load your exact palette.
      </p>
      <textarea readOnly value={url} rows={2} style={{
        width: '100%', background: 'var(--ch-s2)', border: '1px solid var(--ch-b1)',
        borderRadius: 2, color: 'var(--ch-t2)', fontFamily: 'var(--ch-fm)',
        fontSize: 11, padding: 9, resize: 'none', outline: 'none', lineHeight: 1.6,
      }} />
      <div style={{ display: 'flex', height: 24, borderRadius: 2, overflow: 'hidden', gap: 2, marginTop: 8 }}>
        {hexes.map((h, i) => <div key={i} style={{ flex: 1, background: h }} />)}
      </div>
    </Modal>
  )
}

// ─── Save Modal ───────────────────────────────────────────────────────────────

export function SaveModal() {
  const { slots, mode, saveName, setSaveName, closeModal } = useChromaStore()
  const hexes = slots.map(s => s.color.hex)

  const handleSave = () => {
    savePalette(saveName.trim() || 'Unnamed', hexes, mode)
    closeModal()
  }

  return (
    <Modal title="Save Palette" onClose={closeModal}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </>
      }
    >
      <div style={{ display: 'flex', height: 36, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
        {hexes.map((h, i) => <div key={i} style={{ flex: 1, background: h }} />)}
      </div>
      <input
        className="ch-inp"
        value={saveName}
        onChange={e => setSaveName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder="Name your palette…"
        maxLength={40} autoFocus autoComplete="off"
      />
    </Modal>
  )
}

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────

export function ShortcutsModal() {
  const { closeModal } = useChromaStore()
  const shortcuts = [
    { keys: 'Space',  desc: 'Generate new palette' },
    { keys: 'Ctrl+Z', desc: 'Undo last generation' },
    { keys: 'Escape', desc: 'Close modal / cancel' },
    { keys: '?',      desc: 'Show this shortcuts panel' },
  ]
  return (
    <Modal title="Keyboard Shortcuts" onClose={closeModal}
      footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shortcuts.map(({ keys, desc }) => (
          <div key={keys} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--ch-t2)' }}>{desc}</span>
            <kbd style={{
              display: 'inline-block', padding: '2px 8px', border: '1px solid var(--ch-b2)',
              borderRadius: 3, fontSize: 11, color: 'var(--ch-t3)',
              fontFamily: 'var(--ch-fm)', background: 'var(--ch-s2)',
            }}>{keys}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  )
}
