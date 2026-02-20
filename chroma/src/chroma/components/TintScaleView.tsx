import { useNavigate } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { useChromaStore } from '../useChromaStore'
import { generateScale, textColor, parseHex } from '../colorMath'
import { hexToStop } from '../paletteUtils'
import Button from './shared/Button'

const TOKEN_TABS = ['css', 'js', 'tailwind', 'json'] as const

function buildTokens(scale: ReturnType<typeof generateScale>, name: string, tab: string): string {
  switch (tab) {
    case 'css':
      return `:root {\n${scale.map(({ step, hex }) => `  --${name}-${step}: ${hex};`).join('\n')}\n}`
    case 'js':
      return `export const ${name} = {\n${scale.map(({ step, hex }) => `  '${step}': '${hex}',`).join('\n')}\n};`
    case 'tailwind':
      return `// tailwind.config.js\ncolors: {\n  ${name}: {\n${scale.map(({ step, hex }) => `    '${step}': '${hex}',`).join('\n')}\n  }\n}`
    case 'json':
      return JSON.stringify({ [name]: Object.fromEntries(scale.map(({ step, hex }) => [step, hex])) }, null, 2)
    default: return ''
  }
}

export default function TintScaleView() {
  const { scaleHex, scaleName, scaleTokenTab, slots, generate, setSeeds, setScaleHex, setScaleName, setScaleTokenTab } = useChromaStore()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [inputVal, setInputVal] = useState(scaleHex)

  // Keep local input in sync if scaleHex changes from the store (e.g. after undo)
  React.useEffect(() => { setInputVal(scaleHex) }, [scaleHex])

  const scale = useMemo(() => generateScale(scaleHex), [scaleHex])
  const tokens = useMemo(() => buildTokens(scale, scaleName, scaleTokenTab), [scale, scaleName, scaleTokenTab])

  const handleInput = (v: string) => {
    setInputVal(v)
    const h = parseHex(v)
    if (h) setScaleHex(h)
  }

  const handleGenerate = () => {
    const h = parseHex(inputVal)
    if (h) setScaleHex(h)
    else if (slots.length) {
      const h2 = slots[0].color.hex
      setInputVal(h2)
      setScaleHex(h2)
    }
  }

  const copyTokens = () => {
    navigator.clipboard.writeText(tokens).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const useAsSeeds = () => {
    const picks = [1, 3, 5, 7, 9].map(i => scale[i]).filter(Boolean)
    setSeeds(picks.map(({ hex }) => hexToStop(hex)))
    generate()
    navigate({ to: '/palette' })
  }

  return (
    <div className="ch-view-scale">
      <div className="ch-scale-main">
        <div className="ch-view-hd">
          <h2>Tint / Shade Scale</h2>
          <p>50–950 design token scale from any base color. Click a chip to copy.</p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24, maxWidth: 600 }}>
          <div className="ch-scale-swatch" style={{ background: scaleHex }} />
          <input
            className="ch-inp"
            value={inputVal}
            onChange={e => handleInput(e.target.value)}
            placeholder="#3B82F6"
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <Button variant="primary" size="sm" onClick={handleGenerate}>Generate</Button>
        </div>

        <div className="ch-scale-row">
          {scale.map(({ step, hex, rgb }) => {
            const tc = textColor(rgb)
            return (
              <div
                key={step}
                className="ch-scale-chip"
                style={{ background: hex }}
                title={`${step}: ${hex} — click to copy`}
                onClick={() => {
                  navigator.clipboard.writeText(hex).catch(() => {})
                }}
              >
                <div className="ch-scale-step" style={{ color: tc }}>{step}</div>
                <div className="ch-scale-hex" style={{ color: tc }}>{hex.toUpperCase()}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="ch-scale-panel">
        <div className="ch-slabel">Token Name</div>
        <input
          className="ch-inp"
          value={scaleName}
          onChange={e => setScaleName(e.target.value.trim() || 'primary')}
          placeholder="primary"
          maxLength={24}
          autoComplete="off"
          style={{ marginBottom: 12 }}
        />

        <div className="ch-slabel">Export Format</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {TOKEN_TABS.map(tab => (
            <Button
              key={tab}
              variant={scaleTokenTab === tab ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setScaleTokenTab(tab)}
            >
              {tab.toUpperCase()}
            </Button>
          ))}
        </div>

        <pre className="ch-token-pre">{tokens}</pre>
        <Button variant="ghost" size="sm" style={{ width: '100%', marginTop: 8 }} onClick={copyTokens}>
          {copied ? '✓ Copied' : 'Copy'}
        </Button>

        <div className="ch-slabel" style={{ marginTop: 16 }}>Use in Palette</div>
        <Button variant="ghost" size="sm" style={{ width: '100%' }} onClick={useAsSeeds}>
          Use scale as seeds →
        </Button>
      </div>
    </div>
  )
}
