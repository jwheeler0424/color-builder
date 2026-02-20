import React, { useEffect } from 'react'
import { Outlet, Link, useRouterState } from '@tanstack/react-router'
import { useChromaStore } from './useChromaStore'
import { ExportModal, ShareModal, SaveModal, ShortcutsModal } from './components/Modals'
import Button from './components/shared/Button'
import './chroma.css'

const NAV = [
  { to: '/palette',       label: 'Palette'      },
  { to: '/picker',        label: 'Picker'        },
  { to: '/utility',       label: 'Utility'       },
  { to: '/theme',         label: 'Theme'         },
  { to: '/scale',         label: 'Tint Scale'    },
  { to: '/gradient',      label: 'Gradients'     },
  { to: '/mixer',         label: 'Mixer'         },
  { to: '/preview',       label: 'CSS Preview'   },
  { to: '/accessibility', label: 'Accessibility' },
  { to: '/contrast',      label: 'Contrast'      },
  { to: '/colorblind',    label: 'Color Blind'   },
  { to: '/scoring',       label: 'Scoring'       },
  { to: '/converter',     label: 'Converter'     },
  { to: '/extract',       label: 'Image Extract' },
  { to: '/saved',         label: 'Saved'         },
] as const

export default function ChromaShell() {
  const { modal, openModal, closeModal, setSaveName, generate, undo } = useChromaStore()
  const pathname = useRouterState({ select: s => s.location.pathname })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (modal) {
        if (e.key === 'Escape') closeModal()
        return
      }
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); generate() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === '?') openModal('shortcuts')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modal, generate, undo, openModal, closeModal])

  return (
    <div className="ch-app">
      <header className="ch-hdr">
        <div className="ch-brand">Chroma<sup>v3</sup></div>
        <nav className="ch-nav">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`ch-nb${pathname === to ? ' on' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ch-hbtns">
          <Button variant="ghost" size="sm" onClick={undo} title="Undo (Ctrl+Z)">↩</Button>
          <Button variant="ghost" size="sm" onClick={() => openModal('share')} title="Share URL">⤴</Button>
          <Button variant="ghost" size="sm" onClick={() => { setSaveName(''); openModal('save') }} title="Save palette">♡</Button>
          <Button variant="ghost" size="sm" onClick={() => openModal('export')} title="Export">↗</Button>
          <Button variant="ghost" size="sm" onClick={() => openModal('shortcuts')} title="Shortcuts">?</Button>
        </div>
      </header>

      <div className="ch-views">
        <Outlet />
      </div>

      {modal === 'export'    && <ExportModal />}
      {modal === 'share'     && <ShareModal />}
      {modal === 'save'      && <SaveModal />}
      {modal === 'shortcuts' && <ShortcutsModal />}
    </div>
  )
}
