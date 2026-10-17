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
        tooltip: t('header.offlineTooltip'),
      }
    }
    if (!activeSessionId) {
      return {
        label: t('header.online'),
        colorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
        tooltip: t('header.onlineIdleTooltip'),
      }
    }
    if (connectionStatus === 'connected') {
      return {
        label: t('header.online'),
        colorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
        tooltip: t('header.onlineConnectedTooltip'),
      }
    }
    if (connectionStatus === 'connecting') {
      return {
        label: t('header.syncing'),
        colorClass: 'bg-amber-400 animate-pulse',
        tooltip: t('header.syncingTooltip'),
      }
    }
    return {
      label: t('header.connecting'),
      colorClass: 'bg-amber-500',
      tooltip: t('header.connectingTooltip'),
    }
  }, [backendOnline, activeSessionId, connectionStatus, t])

  return (
    <header className="h-14 lg:h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-3 lg:px-6 flex items-center justify-between gap-2 lg:gap-3 relative sticky top-0 z-40 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-2 lg:gap-3.5 min-w-0 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Tv className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm lg:text-base tracking-tight text-white whitespace-nowrap">
                AgentEverywhere<span className="text-indigo-400">Flow</span>
              </span>
              <span className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                STUDIO
              </span>
            </div>
            <p className="hidden xl:block text-[11px] text-slate-400">{t('header.subtitle')}</p>
          </div>
        </div>

        {/* Backend Connection Indicator & Settings Button */}
        <div className="h-5 w-px bg-slate-800 shrink-0" />
        <button
          onClick={onOpenSettingsModal}
          title={statusDisplay.tooltip}
          className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 hover:bg-slate-950 hover:text-slate-200 px-2 lg:px-2.5 py-1 rounded-full border border-slate-800 hover:border-slate-700 transition cursor-pointer group shrink-0"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDisplay.colorClass}`} />
          <span className="capitalize inline-block font-medium whitespace-nowrap">{statusDisplay.label}</span>
          {backendVersion && (
            <span className="hidden xl:inline text-[10px] text-slate-500 font-mono">v{backendVersion}</span>
          )}
          <Settings className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition shrink-0" />
        </button>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          title={t('header.language')}
          className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 hover:bg-slate-950 hover:text-white px-2 lg:px-2.5 py-1 rounded-full border border-slate-800 hover:border-slate-700 transition cursor-pointer shrink-0 font-medium whitespace-nowrap"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{language === 'zh' ? t('header.langZh') : t('header.langEn')}</span>
        </button>
      </div>

      {/* Center: Session Switcher & Target Display */}
      <div className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2.5 min-w-0">
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
          className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 whitespace-nowrap transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>{t('header.newSession')}</span>
        </button>

        {activeSession && (
          <button
            onClick={onResetSession}
            title={t('header.resetTooltip')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition active:scale-95 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right Controls: Permission Mode & Export */}
      <div className="flex items-center gap-1.5 lg:gap-2.5 justify-self-end shrink-0">
        {/* Permission Mode Toggle Button */}
        <button
          onClick={onTogglePermission}
          title={
            permissionMode === 'manual'
              ? t('header.permissionManualTooltip')
              : t('header.permissionAutoTooltip')
          }
          className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition cursor-pointer ${
            permissionMode === 'manual'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20 shadow-sm shadow-amber-500/10'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10'
          }`}
        >
          {permissionMode === 'manual' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t('header.permissionManual')}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t('header.permissionAuto')}</span>
            </>
          )}
        </button>

        {/* Export Workflow */}
        <button
          onClick={onOpenExportModal}
          disabled={!activeSession}
          className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 whitespace-nowrap shrink-0 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{t('header.export')}</span>
        </button>
      </div>
    </header>
  )
}
