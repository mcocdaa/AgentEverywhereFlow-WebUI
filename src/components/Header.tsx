import React from 'react'
import {
  ChevronDown,
  Download,
  Plus,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Tv,
} from 'lucide-react'
import type { PermissionMode, SessionDetail, SessionSummary } from '../api/types'
import type { ConnectionStatus } from '../hooks/useSessionSocket'

interface HeaderProps {
  sessions: SessionSummary[]
  activeSession: SessionDetail | null
  activeSessionId: string | null
  connectionStatus: ConnectionStatus
  backendVersion: string | null
  permissionMode: PermissionMode
  onSelectSession: (sessionId: string) => void
  onOpenNewSessionModal: () => void
  onTogglePermission: () => void
  onOpenExportModal: () => void
  onResetSession: () => void
  onOpenSettingsModal: () => void
}

export const Header: React.FC<HeaderProps> = ({
  sessions,
  activeSession,
  activeSessionId,
  connectionStatus,
  backendVersion,
  permissionMode,
  onSelectSession,
  onOpenNewSessionModal,
  onTogglePermission,
  onOpenExportModal,
  onResetSession,
  onOpenSettingsModal,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                AgentEverywhere<span className="text-indigo-400">Flow</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                STUDIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Viewport-Isolated Embodied Console</p>
          </div>
        </div>

        {/* Backend Connection Indicator & Settings Button */}
        <div className="h-6 w-px bg-slate-800 ml-1" />
        <button
          onClick={onOpenSettingsModal}
          title="Click to configure Backend Endpoint & Port"
          className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 hover:bg-slate-950 hover:text-slate-200 px-2.5 py-1 rounded-full border border-slate-800 hover:border-slate-700 transition cursor-pointer group"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : connectionStatus === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
            }`}
          />
          <span className="capitalize">{connectionStatus}</span>
          {backendVersion && (
            <span className="text-[10px] text-slate-500 font-mono">v{backendVersion}</span>
          )}
          <Settings className="w-3 h-3 text-slate-500 group-hover:text-slate-300 ml-0.5 transition" />
        </button>
      </div>

      {/* Center: Session Switcher & Target Display */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={activeSessionId || ''}
            onChange={(e) => onSelectSession(e.target.value)}
            className="appearance-none bg-slate-950/80 hover:bg-slate-950 text-slate-200 text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg border border-slate-700/80 focus:border-indigo-500 focus:outline-none cursor-pointer transition shadow-inner min-w-[200px]"
          >
            {sessions.length === 0 ? (
              <option value="" disabled>
                No active sessions
              </option>
            ) : (
              sessions.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  {s.title ? `${s.title.slice(0, 24)} (${s.session_id.slice(0, 8)})` : s.session_id}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          onClick={onOpenNewSessionModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Session</span>
        </button>

        {activeSession && (
          <button
            onClick={onResetSession}
            title="Clear conversation history (keep viewport)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right Controls: Permission Mode & Export */}
      <div className="flex items-center gap-3">
        {/* Permission Mode Toggle Button */}
        <button
          onClick={onTogglePermission}
          title="Toggle between Autonomous execution and Human Approval Gate"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
            permissionMode === 'manual'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20 shadow-sm shadow-amber-500/10'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10'
          }`}
        >
          {permissionMode === 'manual' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>GATE: MANUAL</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>GATE: AUTO</span>
            </>
          )}
        </button>

        {/* Export Workflow */}
        <button
          onClick={onOpenExportModal}
          disabled={!activeSession}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export Trace</span>
        </button>
      </div>
    </header>
  )
}
