import { useChromaStore } from '../useChromaStore'
import React, { useMemo } from 'react'
import { scorePalette } from '../colorMath'
import { nearestName } from '../paletteUtils'

// Pure SVG radar chart
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const SIZE = 200
  const cx = SIZE / 2, cy = SIZE / 2, r = 80
  const entries = Object.entries(scores)
  const n = entries.length
  const angles = entries.map((_, i) => ((i / n) * 360 - 90) * (Math.PI / 180))

  const gridLevels = [20, 40, 60, 80, 100]

  const polarPoint = (angle: number, value: number) => {
    const pct = value / 100
    return { x: cx + r * pct * Math.cos(angle), y: cy + r * pct * Math.sin(angle) }
  }

  const dataPoints = entries.map(([, v], i) => polarPoint(angles[i], v))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  const labelOffset = 20
  const labels = entries.map(([key, val], i) => {
    const lp = polarPoint(angles[i], 100 + labelOffset)
    return { key, val, x: lp.x, y: lp.y }
  })

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Grid circles */}
      {gridLevels.map(pct => (
        <circle key={pct} cx={cx} cy={cy} r={(pct / 100) * r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={1} />
      ))}
      {/* Spoke lines */}
      {angles.map((angle, i) => {
        const end = polarPoint(angle, 100)
        return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="rgba(255,255,255,.08)" strokeWidth={1} />
      })}
      {/* Data polygon */}
      <path d={dataPath} fill="rgba(232,255,0,.15)" stroke="#e8ff00" strokeWidth={1.5} />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={4} fill="#e8ff00" />
      ))}
      {/* Labels */}
      {labels.map(({ key, val, x, y }) => (
        <text key={key} x={x.toFixed(1)} y={y.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill="rgba(255,255,255,.5)" fontFamily="Space Mono, monospace">
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </text>
      ))}
    </svg>
  )
}

export default function PaletteScoring() {
  const { slots } = useChromaStore()
  const score = useMemo(() => scorePalette(slots), [slots])

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd"><h2>Palette Scoring</h2></div>
        <p style={{ color: 'var(--ch-t3)', fontSize: 12 }}>Generate a palette first.</p>
      </div>
    )
  }

  const { balance, accessibility, harmony, uniqueness, overall } = score
  const radarData = { balance, accessibility, harmony, uniqueness }

  const scoreColor = (v: number) => v >= 75 ? '#00e676' : v >= 50 ? '#fff176' : '#ff4455'

  const feedback: { label: string; value: number; note: string }[] = [
    {
      label: 'Hue Balance',
      value: balance,
      note: balance >= 75
        ? 'Well-distributed hues across the spectrum.'
        : balance >= 50
        ? 'Hues are somewhat clustered. Try a triadic or square harmony.'
        : 'Very clustered hues. Consider widening the hue spread.',
    },
    {
      label: 'Accessibility',
      value: accessibility,
      note: accessibility >= 75
        ? 'Most color pairs pass WCAG AA — great for UI use.'
        : accessibility >= 40
        ? 'Some pairs pass, but contrast could be improved.'
        : 'Few pairs meet WCAG AA. Increase lightness range between colors.',
    },
    {
      label: 'Saturation Harmony',
      value: harmony,
      note: harmony >= 75
        ? 'Saturations are consistent — palette feels cohesive.'
        : harmony >= 50
        ? 'Some saturation variation. Can work for an expressive palette.'
        : 'High saturation variance. Mix saturated and muted tones intentionally.',
    },
    {
      label: 'Uniqueness',
      value: uniqueness,
      note: uniqueness >= 75
        ? 'Colors are very distinct from each other — excellent for labeling.'
        : uniqueness >= 40
        ? 'Moderate distinctiveness.'
        : 'Colors are perceptually similar. Increasing lightness or hue spread will help.',
    },
  ]

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="ch-view-hd">
          <h2>Palette Scoring</h2>
          <p>Objective evaluation across four dimensions. Scores are relative, not absolute targets.</p>
        </div>

        <div className="ch-score-layout">
          {/* Radar */}
          <div className="ch-score-radar">
            <RadarChart scores={radarData} />
            <div className="ch-score-overall">
              <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(overall), fontFamily: 'var(--ch-fd)' }}>
                {overall}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ch-t3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Overall
              </div>
            </div>
          </div>

          {/* Score bars */}
          <div className="ch-score-bars">
            {feedback.map(({ label, value, note }) => (
              <div key={label} className="ch-score-bar-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(value) }}>{value}</span>
                </div>
                <div style={{ height: 4, background: 'var(--ch-b2)', borderRadius: 2, marginBottom: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, width: `${value}%`,
                    background: scoreColor(value), transition: 'width .4s var(--ch-ease)',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ch-t3)', lineHeight: 1.5 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Palette preview */}
        <div style={{ marginTop: 24 }}>
          <div className="ch-slabel" style={{ marginBottom: 8 }}>Your Palette</div>
          <div style={{ display: 'flex', height: 52, borderRadius: 4, overflow: 'hidden' }}>
            {slots.map((slot, i) => (
              <div key={i} style={{ flex: 1, background: slot.color.hex, display: 'flex', alignItems: 'flex-end', padding: '0 0 4px 4px' }}>
                <span style={{ fontSize: 8, color: slot.color.hex === '#000000' ? '#fff' : 'rgba(0,0,0,.6)', fontFamily: 'var(--ch-fm)' }}>
                  {nearestName(slot.color.rgb).split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
