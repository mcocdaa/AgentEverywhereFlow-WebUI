import React, { useCallback, useEffect, useState } from 'react'
import {
  AppWindow,
  CheckCircle2,
  Code2,
  Layers,
  Monitor,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import type { ExecutionMode, PermissionMode, TargetInfo } from '../api/types'
import { useLanguage } from '../i18n/LanguageContext'

interface NewSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionCreated: (sessionId: string) => void
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const { t } = useLanguage()
  const [targets, setTargets] = useState<TargetInfo[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | 'window' | 'display'>('all')
  const [mode, setMode] = useState<ExecutionMode>('minimal')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('auto')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshedNotice, setRefreshedNotice] = useState(false)

  const fetchTargets = useCallback(async () => {
    setLoading(true)
    setError(null)
    const startTime = Date.now()
    try {
      const data = await api.listTargets()
      setTargets(data)

      // Ensure rotation is visible for at least 350ms so user gets clear tactile feedback
      const elapsed = Date.now() - startTime
      if (elapsed < 350) {
        await new Promise((r) => setTimeout(r, 350 - elapsed))
      }

      // If selectedTargetId was not set, or no longer exists in newly discovered targets
      setSelectedTargetId((curr) => {
        if (data.length === 0) return ''
        const exists = data.some((t) => t.target_id === curr)
        return exists ? curr : data[0].target_id
      })

      setRefreshedNotice(true)
      setTimeout(() => setRefreshedNotice(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch targets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void fetchTargets()
    }
  }, [isOpen, fetchTargets])

  if (!isOpen) return null

  const filteredTargets = targets.filter((t) => {
    if (filterType === 'all') return true
    return t.target_type === filterType
  })

  const handleCreate = async () => {
    if (!selectedTargetId) {
      setError(t('newSession.selectTargetError'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const session = await api.createSession({
        target_id: selectedTargetId,
        mode,
        permission_mode: permissionMode,
      })
      onSessionCreated(session.session_id)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{t('newSession.title')}</h2>
              <p className="text-xs text-slate-400">
                {t('newSession.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          {/* 1. Target Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('newSession.selectTarget')}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-slate-800 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('newSession.all')} ({targets.length})
                  </button>
                  <button
                    onClick={() => setFilterType('window')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      filterType === 'window'
                        ? 'bg-slate-800 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('newSession.windows')} ({targets.filter((t) => t.target_type === 'window').length})
                  </button>
                  <button
                    onClick={() => setFilterType('display')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      filterType === 'display'
                        ? 'bg-slate-800 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('newSession.displays')} ({targets.filter((t) => t.target_type === 'display').length})
                  </button>
                </div>
                {refreshedNotice && (
                  <span className="text-[11px] text-emerald-400 font-medium animate-in fade-in duration-150">
                    {t('newSession.updated')}
                  </span>
                )}
                <button
                  onClick={fetchTargets}
                  disabled={loading}
                  title={t('newSession.refreshTargets')}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Target List Grid */}
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredTargets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
                  {loading ? t('newSession.discovering') : t('newSession.noTargets')}
                </div>
              ) : (
                filteredTargets.map((target) => {
                  const isSelected = selectedTargetId === target.target_id
                  return (
                    <div
                      key={target.target_id}
                      onClick={() => setSelectedTargetId(target.target_id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500/60 shadow-md shadow-indigo-500/5'
                          : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {target.target_type === 'display' ? (
                            <Monitor className="w-4 h-4" />
                          ) : (
                            <AppWindow className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-2">
                            <span>{target.title || t('newSession.untitledTarget')}</span>
                            {target.is_minimized && (
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 rounded">
                                {t('newSession.minimized')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                            <span>{target.process_name || target.target_type}</span>
                            <span>•</span>
                            <span>
                              {target.rect.width}×{target.rect.height}
                            </span>
                            <span>•</span>
                            <span>ID: {target.target_id.slice(0, 16)}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 2. Execution Mode Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              {t('newSession.executionMode')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setMode('minimal')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  mode === 'minimal'
                    ? 'bg-indigo-600/15 border-indigo-500/60 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">{t('newSession.modeMinimal')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('newSession.modeMinimalDesc')}
                </p>
              </div>

              <div
                onClick={() => setMode('guarded')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  mode === 'guarded'
                    ? 'bg-indigo-600/15 border-indigo-500/60 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white">{t('newSession.modeGuarded')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('newSession.modeGuardedDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Permission Gate Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              {t('newSession.permissionMode')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setPermissionMode('auto')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  permissionMode === 'auto'
                    ? 'bg-emerald-600/15 border-emerald-500/60 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">{t('newSession.permAuto')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('newSession.permAutoDesc')}
                </p>
              </div>

              <div
                onClick={() => setPermissionMode('manual')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  permissionMode === 'manual'
                    ? 'bg-amber-600/15 border-amber-500/60 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">{t('newSession.permManual')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('newSession.permManualDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            {t('newSession.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting || !selectedTargetId}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('newSession.bindingSession')}</span>
              </>
            ) : (
              <span>{t('newSession.launchSession')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
