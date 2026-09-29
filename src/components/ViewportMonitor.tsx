import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Crosshair,
  Maximize2,
  Minimize2,
  Monitor,
  RefreshCw,
} from 'lucide-react'
import { api } from '../api/client'
import type { ActionMarker, SessionDetail } from '../api/types'

interface ViewportMonitorProps {
  session: SessionDetail | null
  markers: ActionMarker[]
  refreshTrigger: number
  onManualRefresh: () => void
}

export const ViewportMonitor: React.FC<ViewportMonitorProps> = ({
  session,
  markers,
  refreshTrigger,
  onManualRefresh,
}) => {
  const [loading, setLoading] = useState(false)
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Derive imgUrl cleanly without unnecessary state updates in effect
  const imgUrl = useMemo(() => {
    if (!session) return null
    return `${api.getScreenshotUrl(session.session_id)}&_rt=${refreshTrigger}`
  }, [session, refreshTrigger])

  // Periodic polling if auto-refresh is enabled
  useEffect(() => {
    if (!autoRefresh || !session) return
    const interval = window.setInterval(() => {
      onManualRefresh()
    }, 2000)
    return () => window.clearInterval(interval)
  }, [autoRefresh, session, onManualRefresh])

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || !session) return
    const rect = imgRef.current.getBoundingClientRect()
    const scaleX = session.target.rect.width / rect.width
    const scaleY = session.target.rect.height / rect.height

    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top

    const x = Math.max(0, Math.min(Math.round(clientX * scaleX), session.target.rect.width))
    const y = Math.max(0, Math.min(Math.round(clientY * scaleY), session.target.rect.height))

    setHoverCoords({ x, y })
  }

  const handleMouseLeave = () => {
    setHoverCoords(null)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error)
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error)
    }
  }

  const targetWidth = session?.target.rect.width || 1920
  const targetHeight = session?.target.rect.height || 1080

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full'
      }`}
    >
      {/* Viewport Top Bar */}
      <div className="h-11 px-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 overflow-hidden">
          <Monitor className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate">
            {session ? session.target.title : 'No Active Viewport'}
          </span>
          {session && (
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded font-mono shrink-0">
              {targetWidth} × {targetHeight}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Coordinates HUD */}
          {hoverCoords && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded shadow-sm">
              <Crosshair className="w-3 h-3" />
              <span>
                X: {hoverCoords.x}, Y: {hoverCoords.y}
              </span>
            </div>
          )}

          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 w-3 h-3"
            />
            <span className="text-[11px]">Auto (2s)</span>
          </label>

          {/* Manual Refresh */}
          <button
            onClick={() => {
              setLoading(true)
              onManualRefresh()
            }}
            title="Refresh viewport snapshot"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Viewport'}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Screen Frame Content Area */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden p-2">
        {!session ? (
          <div className="text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto border border-slate-700/50">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">No Target Bound</p>
              <p className="text-[11px] text-slate-500">
                Create or select a session to stream isolated viewport.
              </p>
            </div>
          </div>
        ) : imgUrl ? (
          <div className="relative max-w-full max-h-full flex items-center justify-center select-none group">
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Viewport frame"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="max-h-[calc(100vh-14rem)] max-w-full object-contain rounded-lg border border-slate-800 shadow-2xl pointer-events-auto cursor-crosshair transition-opacity duration-150"
            />

            {/* Ripple Markers for Agent Actions */}
            {markers.map((marker) => {
              const xPercent = (marker.x / targetWidth) * 100
              const yPercent = (marker.y / targetHeight) * 100
              return (
                <div
                  key={marker.id}
                  style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                >
                  {/* Radar pulse ring */}
                  <span className="absolute -inset-3 rounded-full bg-rose-500/40 animate-ping" />
                  <span className="absolute -inset-1 rounded-full bg-rose-500/80" />
                  <span className="relative block w-3 h-3 rounded-full bg-rose-400 border border-white shadow-[0_0_10px_rgba(244,63,94,1)]" />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-950/90 text-rose-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-rose-500/30 whitespace-nowrap">
                    {marker.action} ({marker.x}, {marker.y})
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-xs text-slate-500">Loading viewport capture...</div>
        )}
      </div>
    </div>
  )
}
