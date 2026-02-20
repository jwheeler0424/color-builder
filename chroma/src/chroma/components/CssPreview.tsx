import { useChromaStore } from '../useChromaStore'
import React, { useMemo } from 'react'
import { textColor, contrastRatio } from '../colorMath'

export default function CssPreview() {
  const { slots } = useChromaStore()

  const colors = useMemo(() => {
    if (!slots.length) return {
      bg: '#0f0f0f', surface: '#1a1a1a', accent: '#e8ff00',
      text: '#f0f0f0', muted: '#666', border: '#222',
    }
    // Assign semantic roles: darkest=bg, lightest=text, most-saturated=accent
    const sorted = [...slots].sort((a, b) => a.color.hsl.l - b.color.hsl.l)
    const bySat = [...slots].sort((a, b) => b.color.hsl.s - a.color.hsl.s)
    const bg = sorted[0].color.hex
    const bgRgb = sorted[0].color.rgb
    const surface = sorted.length > 1 ? sorted[1].color.hex : '#1a1a1a'
    const accent = bySat[0].color.hex
    const textHex = textColor(bgRgb)
    const muted = slots.find(s =>
      contrastRatio(s.color.rgb, bgRgb) >= 2 && contrastRatio(s.color.rgb, bgRgb) < 4.5
    )?.color.hex ?? textHex

    return { bg, surface, accent, text: textHex, muted, border: surface }
  }, [slots])

  const { bg, surface, accent, text, muted, border } = colors

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd"><h2>Live CSS Preview</h2></div>
        <p style={{ color: 'var(--ch-t3)', fontSize: 12 }}>Generate a palette first.</p>
      </div>
    )
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="ch-view-hd">
          <h2>Live CSS Preview</h2>
          <p>Your palette applied to a real UI component. Colors are semantically assigned based on lightness and saturation.</p>
        </div>

        {/* Role legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { role: 'Background', hex: bg },
            { role: 'Surface', hex: surface },
            { role: 'Accent', hex: accent },
          ].map(({ role, hex }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 14, height: 14, borderRadius: 2, background: hex, border: '1px solid rgba(255,255,255,.1)' }} />
              <span style={{ color: 'var(--ch-t3)' }}>{role}</span>
            </div>
          ))}
        </div>

        {/* Simulated app UI */}
        <div style={{
          background: bg, border: `1px solid ${border}`, borderRadius: 8,
          overflow: 'hidden', fontFamily: 'system-ui, sans-serif',
        }}>
          {/* Nav bar */}
          <div style={{
            background: surface, borderBottom: `1px solid ${border}`,
            padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
              <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>App Name</span>
              {['Home', 'Products', 'About'].map(item => (
                <span key={item} style={{ color: muted, fontSize: 13, cursor: 'pointer' }}>{item}</span>
              ))}
            </div>
            <div style={{
              background: accent, color: textColor(slots.find(s => s.color.hex === accent)?.color.rgb ?? { r: 232, g: 255, b: 0 }),
              padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              Sign Up
            </div>
          </div>

          {/* Hero */}
          <div style={{ padding: '40px 20px', borderBottom: `1px solid ${border}` }}>
            <div style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 12,
              background: `${accent}22`, color: accent, fontSize: 11, fontWeight: 700,
              marginBottom: 12,
            }}>
              New Release
            </div>
            <div style={{ color: text, fontSize: 28, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
              Beautiful by default
            </div>
            <div style={{ color: muted, fontSize: 14, marginBottom: 20, maxWidth: 440, lineHeight: 1.6 }}>
              A design system built around your palette. Every component responds to your color choices automatically.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{
                background: accent,
                color: textColor(slots.find(s => s.color.hex === accent)?.color.rgb ?? { r: 232, g: 255, b: 0 }),
                padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                Get Started
              </div>
              <div style={{
                border: `1px solid ${border}`, color: text,
                padding: '10px 20px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
              }}>
                Learn More
              </div>
            </div>
          </div>

          {/* Cards row */}
          <div style={{ padding: '24px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {['Analytics', 'Automation', 'Integrations'].map((title, i) => (
              <div key={title} style={{
                background: surface, border: `1px solid ${border}`,
                borderRadius: 6, padding: 16,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: `${accent}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: accent }} />
                </div>
                <div style={{ color: text, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{title}</div>
                <div style={{ color: muted, fontSize: 11, lineHeight: 1.5 }}>
                  Powerful {title.toLowerCase()} built right into your workflow.
                </div>
              </div>
            ))}
          </div>

          {/* Input + button row */}
          <div style={{
            padding: '16px 20px', background: surface, borderTop: `1px solid ${border}`,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <div style={{
              flex: 1, background: bg, border: `1px solid ${border}`,
              borderRadius: 4, padding: '8px 12px', color: muted, fontSize: 12,
            }}>
              Enter your email address…
            </div>
            <div style={{
              background: accent,
              color: textColor(slots.find(s => s.color.hex === accent)?.color.rgb ?? { r: 232, g: 255, b: 0 }),
              padding: '8px 16px', borderRadius: 4, fontSize: 12, fontWeight: 700,
            }}>
              Subscribe
            </div>
          </div>
        </div>

        {/* CSS vars output */}
        <div style={{ marginTop: 20 }}>
          <div className="ch-slabel" style={{ marginBottom: 8 }}>Generated CSS Variables</div>
          <pre className="ch-token-pre">{`:root {
  --color-bg:      ${bg};
  --color-surface: ${surface};
  --color-accent:  ${accent};
  --color-text:    ${text};
  --color-muted:   ${muted};
  --color-border:  ${border};
}`}</pre>
        </div>
      </div>
    </div>
  )
}
