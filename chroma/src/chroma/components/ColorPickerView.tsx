import React, { useCallback } from 'react'
import type { HSL } from '../types'
import { hslToRgb, rgbToHex, rgbToHsl, rgbToHsv, rgbToCmyk, rgbToOklab, oklabToLch, luminance, parseHex } from '../colorMath'
import { nearestName, hexToStop } from '../paletteUtils'
import { useChromaStore } from '../useChromaStore'
import { useNavigate } from '@tanstack/react-router'
import ColorWheel from './shared/ColorWheel'
import Button from './shared/Button'

export default function ColorPickerView() {
  const {
    pickerHsl, pickerAlpha, recentColors, slots,
    setPickerHsl, setPickerAlpha, setSeeds, addRecent, addSlot, generate,
  } = useChromaStore()
  const navigate = useNavigate()

  const rgb = hslToRgb(pickerHsl)
  const hex = rgbToHex(rgb)
  const hsv = rgbToHsv(rgb)
  const cmyk = rgbToCmyk(rgb)
  const lch = oklabToLch(rgbToOklab(rgb))
  const alphaHex = Math.round(pickerAlpha / 100 * 255).toString(16).padStart(2, '0')
  const displayHex = pickerAlpha < 100 ? `${hex}${alphaHex}` : hex
  const previewStyle = pickerAlpha < 100
    ? { background: `rgba(${rgb.r},${rgb.g},${rgb.b},${pickerAlpha / 100})` }
    : { background: hex }

  const setHsl = useCallback((partial: Partial<HSL>) => {
    setPickerHsl({ ...pickerHsl, ...partial })
  }, [setPickerHsl, pickerHsl])

  const handleHexInput = useCallback((v: string) => {
    const h = parseHex(v)
    if (h) setPickerHsl(rgbToHsl(hexToStop(h).rgb))
  }, [setPickerHsl])

  const useSeed = useCallback(() => {
    setSeeds([hexToStop(hex)])
    addRecent(hex)
    generate()
    navigate({ to: '/palette' })
  }, [hex, setSeeds, addRecent, generate, navigate])

  const addToPalette = useCallback(() => {
    addSlot(hexToStop(hex))
    addRecent(hex)
  }, [hex, addSlot, addRecent])

  return (
    <div className="ch-view-picker">
      <div className="ch-picker-main">
        <ColorWheel hsl={pickerHsl} size={260} onChange={setHsl} />

        <div className="ch-sliders">
          <div className="ch-slider-row">
            <div className="ch-slider-label">Hue <span>{Math.round(pickerHsl.h)}°</span></div>
            <div className="ch-hue-track">
              <input type="range" min={0} max={359} step={1} value={Math.round(pickerHsl.h)}
                onChange={e => setHsl({ h: +e.target.value })} />
            </div>
          </div>
          <div className="ch-slider-row">
            <div className="ch-slider-label">Saturation <span>{Math.round(pickerHsl.s)}%</span></div>
            <div className="ch-sat-track" style={{
              background: `linear-gradient(to right,hsl(${pickerHsl.h},0%,${pickerHsl.l}%),hsl(${pickerHsl.h},100%,${pickerHsl.l}%))`
            }}>
              <input type="range" min={0} max={100} value={Math.round(pickerHsl.s)}
                onChange={e => setHsl({ s: +e.target.value })} />
            </div>
          </div>
          <div className="ch-slider-row">
            <div className="ch-slider-label">Lightness <span>{Math.round(pickerHsl.l)}%</span></div>
            <div className="ch-lit-track" style={{
              background: `linear-gradient(to right,hsl(${pickerHsl.h},${pickerHsl.s}%,0%),hsl(${pickerHsl.h},${pickerHsl.s}%,50%),hsl(${pickerHsl.h},${pickerHsl.s}%,100%))`
            }}>
              <input type="range" min={0} max={100} value={Math.round(pickerHsl.l)}
                onChange={e => setHsl({ l: +e.target.value })} />
            </div>
          </div>
          <div className="ch-slider-row">
            <div className="ch-slider-label">Alpha <span>{pickerAlpha}%</span></div>
            <div className="ch-alpha-track" style={{ background: `linear-gradient(to right, transparent, ${hex})` }}>
              <div className="ch-alpha-checker" />
              <input type="range" min={0} max={100} value={pickerAlpha}
                onChange={e => setPickerAlpha(+e.target.value)} />
            </div>
          </div>
        </div>

        <div className="ch-color-preview-row">
          <div className="ch-cprev" style={previewStyle} />
          <div className="ch-cprev-inputs">
            <div className="ch-hex-inp-row">
              <label>HEX</label>
              <input className="ch-inp" defaultValue={hex} key={hex}
                onChange={e => handleHexInput(e.target.value)}
                maxLength={9} spellCheck={false} autoComplete="off"
                style={{ letterSpacing: '.06em', fontFamily: 'var(--ch-fm)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <Button variant="primary" size="sm" onClick={useSeed}>→ Use as Seed</Button>
              <Button variant="ghost" size="sm" onClick={addToPalette}>+ Add to Palette</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="ch-picker-panel">
        <div>
          <div className="ch-slabel">Recent Colors</div>
          <div className="ch-recent-swatches">
            {recentColors.map((rh, i) => (
              <div key={i} className="ch-rswatch" style={{ background: rh }} title={rh}
                onClick={() => setPickerHsl(rgbToHsl(hexToStop(rh).rgb))} />
            ))}
          </div>
        </div>

        <div>
          <div className="ch-slabel">Color Info</div>
          <div className="ch-picker-info">
            <div>Name <strong>{nearestName(rgb)}</strong></div>
            <div>HEX <strong>{displayHex.toUpperCase()}</strong></div>
            <div>RGB <strong>{rgb.r}, {rgb.g}, {rgb.b}</strong></div>
            <div>HSV <strong>{Math.round(hsv.h)}° {Math.round(hsv.s)}% {Math.round(hsv.v)}%</strong></div>
            <div>CMYK <strong>{cmyk.c}% {cmyk.m}% {cmyk.y}% {cmyk.k}%</strong></div>
            <div>Luminance <strong>{(luminance(rgb) * 100).toFixed(1)}%</strong></div>
            <div>OKLCH <strong>{lch.L.toFixed(1)}% {(lch.C / 100).toFixed(3)} {Math.round(lch.H)}°</strong></div>
          </div>
        </div>

        {slots.length > 0 && (
          <div>
            <div className="ch-slabel">Palette Colors</div>
            <div className="ch-recent-swatches">
              {slots.map((slot, i) => (
                <div key={i} className="ch-rswatch" style={{ background: slot.color.hex }} title={slot.color.hex}
                  onClick={() => setPickerHsl(slot.color.hsl)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
