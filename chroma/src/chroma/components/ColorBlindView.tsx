import { useChromaStore } from '../useChromaStore'
import React from 'react'
import { applySimMatrix, rgbToHex, textColor } from '../colorMath'
import { CB_TYPES } from '../constants'

export default function ColorBlindView() {
  const { slots } = useChromaStore()

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd"><h2>Color Blindness Simulator</h2></div>
        <p style={{ color: 'var(--ch-t3)', fontSize: 12 }}>Generate a palette first.</p>
      </div>
    )
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div className="ch-view-hd">
        <h2>Color Blindness Simulator</h2>
        <p>How your palette appears under different types of color vision deficiency.</p>
      </div>
      <div className="ch-sim-grid">
        {CB_TYPES.map(cbType => {
          const simSlots = cbType.id === 'normal'
            ? slots
            : slots.map(slot => ({
                ...slot,
                color: {
                  ...slot.color,
                  rgb: applySimMatrix(slot.color.rgb, cbType.matrix),
                  hex: rgbToHex(applySimMatrix(slot.color.rgb, cbType.matrix)),
                },
              }))

          return (
            <div key={cbType.id} className="ch-sim-card">
              <div className="ch-sim-card-hd">
                <div className="ch-sim-card-title">{cbType.name}</div>
                <div className="ch-sim-card-sub">{cbType.desc}</div>
              </div>
              <div className="ch-sim-strip">
                {simSlots.map((slot, i) => {
                  const tc = textColor(slot.color.rgb)
                  return (
                    <div key={i} className="ch-sim-chip" style={{ background: slot.color.hex }}>
                      <span className="ch-sim-hex" style={{ color: tc }}>
                        {slot.color.hex.toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
