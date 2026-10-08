import React, { useMemo } from 'react'
import {
  Download,
  Globe,
  Plus,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Tv,
} from 'lucide-react'
import type { PermissionMode, SessionDetail, SessionSummary } from '../api/types'
import type { ConnectionStatus } from '../hooks/useSessionSocket'
import { useLanguage } from '../i18n/LanguageContext'
import { SessionSelector } from './SessionSelector'

interface HeaderProps {
  sessions: SessionSummary[]
  activeSession: SessionDetail | null
  activeSessionId: string | null
  backendOnline: boolean
  connectionStatus: ConnectionStatus
  backendVersion: string | null
  permissionMode: PermissionMode
  onSelectSession: (sessionId: string) => void
  onOpenNewSessionModal: () => void
  onTogglePermission: () => void
  onOpenExportModal: () => void
  onResetSession: () => void
  onOpenSettingsModal: () => void
  onDeleteSession: (sessionId: string) => Promise<void>
  onRenameSession: (sessionId: string, newTitle: string) => Promise<void>
}

export const Header: React.FC<HeaderProps> = ({
  sessions,
  activeSession,
  activeSessionId,
  backendOnline,
  connectionStatus,
  backendVersion,
  permissionMode,
  onSelectSession,
  onOpenNewSessionModal,
  onTogglePermission,
  onOpenExportModal,
  onResetSession,
  onOpenSettingsModal,
  onDeleteSession,
  onRenameSession,
}) => {
  const { t, language, toggleLanguage } = useLanguage()

  const statusDisplay = useMemo(() => {
    if (!backendOnline) {
      return {
        label: t('header.offline'),
        colorClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        tooltip: 'Backend daemon offline. Click to check port or endpoint settings.',
      }
    }
    if (!activeSessionId) {
      return {
        label: t('header.online'),
        colorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
        tooltip: 'Backend daemon is online. Click "+ New Session" to bind a target window.',
      }
    }
    if (connectionStatus === 'connected') {
      return {
        label: t('header.online'),
        colorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
        tooltip: 'Session stream connected.',
      }
    }
    if (connectionStatus === 'connecting') {
      return {
        label: t('header.syncing'),
        colorClass: 'bg-amber-400 animate-pulse',
        tooltip: 'Connecting session stream...',
      }
    }
    return {
      label: t('header.connecting'),
      colorClass: 'bg-amber-500',
      tooltip: 'Session stream reconnecting...',
    }
  }, [backendOnline, activeSessionId, connectionStatus, t])

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between relative sticky top-0 z-40 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
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
            <p className="text-[11px] text-slate-400">{t('header.subtitle')}</p>
          </div>
        </div>

        {/* Backend Connection Indicator & Settings Button */}
        <div className="h-6 w-px bg-slate-800 ml-1 shrink-0" />
        <button
          onClick={onOpenSettingsModal}
          title={statusDisplay.tooltip}
          className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 hover:bg-slate-950 hover:text-slate-200 px-2.5 py-1 rounded-full border border-slate-800 hover:border-slate-700 transition cursor-pointer group shrink-0"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDisplay.colorClass}`} />
          <span className="capitalize inline-block min-w-[64px] text-left font-medium">{statusDisplay.label}</span>
          {backendVersion && (
            <span className="text-[10px] text-slate-500 font-mono">v{backendVersion}</span>
          )}
          <Settings className="w-3 h-3 text-slate-500 group-hover:text-slate-300 ml-0.5 transition shrink-0" />
        </button>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          title={t('header.language')}
          className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 hover:bg-slate-950 hover:text-white px-2.5 py-1 rounded-full border border-slate-800 hover:border-slate-700 transition cursor-pointer shrink-0 font-medium"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>{language === 'zh' ? '中文' : 'EN'}</span>
        </button>
      </div>

      {/* Center: Session Switcher & Target Display - Strictly Pinned to Exact Center */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
        <SessionSelector
          sessions={sessions}
          activeSessionId={activeSessionId}
          activeSession={activeSession}
          onSelectSession={onSelectSession}
          onOpenNewSessionModal={onOpenNewSessionModal}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
        />

        <button
          onClick={onOpenNewSessionModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('header.newSession')}</span>
        </button>

        {activeSession && (
          <button
            onClick={onResetSession}
            title={t('header.resetTooltip')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right Controls: Permission Mode & Export */}
      <div className="flex items-center gap-3 justify-self-end">
        {/* Permission Mode Toggle Button */}
        <button
          onClick={onTogglePermission}
          title={
            permissionMode === 'manual'
              ? t('header.permissionManualTooltip')
              : t('header.permissionAutoTooltip')
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
            permissionMode === 'manual'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20 shadow-sm shadow-amber-500/10'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10'
          }`}
        >
          {permissionMode === 'manual' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('header.permissionManual')}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('header.permissionAuto')}</span>
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
          <span>{t('header.export')}</span>
        </button>
      </div>
    </header>
  )
}
