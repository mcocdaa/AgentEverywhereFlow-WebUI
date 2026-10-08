import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  ChevronDown,
  Search,
  X,
  Pencil,
  Trash2,
  Check,
  Plus,
  Monitor,
  AppWindow,
  RotateCw,
} from 'lucide-react'
import type { SessionDetail, SessionSummary } from '../api/types'
import { useLanguage } from '../i18n/LanguageContext'

interface SessionSelectorProps {
  sessions: SessionSummary[]
  activeSessionId: string | null
  activeSession: SessionDetail | null
  onSelectSession: (sessionId: string) => void
  onOpenNewSessionModal: () => void
  onDeleteSession: (sessionId: string) => Promise<void>
  onRenameSession: (sessionId: string, newTitle: string) => Promise<void>
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  activeSessionId,
  activeSession,
  onSelectSession,
  onOpenNewSessionModal,
  onDeleteSession,
  onRenameSession,
}) => {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Close popover on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setEditingSessionId(null)
        setDeletingSessionId(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingSessionId) {
          setEditingSessionId(null)
        } else if (deletingSessionId) {
          setDeletingSessionId(null)
        } else {
          setIsOpen(false)
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, editingSessionId, deletingSessionId])

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
      setEditingSessionId(null)
      setDeletingSessionId(null)
    }
  }, [isOpen])

  // Focus edit input when entering edit mode
  useEffect(() => {
    if (editingSessionId) {
      setTimeout(() => {
        editInputRef.current?.focus()
        editInputRef.current?.select()
      }, 50)
    }
  }, [editingSessionId])

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) => {
      const titleMatch = (s.title || '').toLowerCase().includes(q)
      const targetTitleMatch = (s.target_title || '').toLowerCase().includes(q)
      const targetIdMatch = (s.target_id || '').toLowerCase().includes(q)
      const idMatch = s.session_id.toLowerCase().includes(q)
      return titleMatch || targetTitleMatch || targetIdMatch || idMatch
    })
  }, [sessions, searchQuery])

  // Current active session label
  const currentTitle = useMemo(() => {
    if (activeSession) {
      return activeSession.title || activeSession.target.title
    }
    const found = sessions.find((s) => s.session_id === activeSessionId)
    if (found) {
      return found.title || found.target_title || found.session_id
    }
    return sessions.length === 0 ? t('header.noActiveSessions') : t('header.newSession')
  }, [activeSession, activeSessionId, sessions, t])

  const handleStartRename = (e: React.MouseEvent, s: SessionSummary) => {
    e.stopPropagation()
    setEditingSessionId(s.session_id)
    setEditingTitle(s.title || s.target_title || s.session_id)
    setDeletingSessionId(null)
  }

  const handleSaveRename = async (e: React.MouseEvent | React.FormEvent, sessionId: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!editingTitle.trim()) return
    setIsSubmitting(true)
    try {
      await onRenameSession(sessionId, editingTitle.trim())
      setEditingSessionId(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(null)
  }

  const handleStartDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setDeletingSessionId(sessionId)
    setEditingSessionId(null)
  }

  const handleConfirmDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setIsSubmitting(true)
    try {
      await onDeleteSession(sessionId)
      setDeletingSessionId(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingSessionId(null)
  }

  const isTargetDisplay = (targetId: string) => {
    return targetId.toLowerCase().startsWith('display:')
  }

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shadow-sm border max-w-[280px] sm:max-w-[340px] truncate ${
          isOpen
            ? 'bg-slate-900 border-indigo-500 text-white shadow-indigo-500/20'
            : 'bg-slate-950/80 hover:bg-slate-900 text-slate-200 border-slate-700/80 hover:border-slate-600'
        }`}
        title={currentTitle}
      >
        {activeSession && isTargetDisplay(activeSession.target.target_id) ? (
          <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        ) : (
          <AppWindow className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        )}

        <span className="truncate flex-1 text-left font-medium">
          {currentTitle}
        </span>

        {activeSessionId && (
          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
            {activeSessionId.slice(0, 8)}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[360px] sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* 1. Search Bar */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('sessions.search')}
                className="w-full bg-slate-900/90 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-8 pr-7 py-1.5 border border-slate-800 focus:border-indigo-500 focus:outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 shrink-0">
              {filteredSessions.length}/{sessions.length}
            </span>
          </div>

          {/* 2. Sessions List */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-800/40 p-1.5 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredSessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Search className="w-6 h-6 text-slate-600 opacity-60" />
                <span>{t('sessions.noMatches')}</span>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.session_id === activeSessionId
                const isEditing = editingSessionId === s.session_id
                const isDeleting = deletingSessionId === s.session_id
                const isDisplay = isTargetDisplay(s.target_id)

                return (
                  <div
                    key={s.session_id}
                    onClick={() => {
                      if (!isEditing && !isDeleting) {
                        onSelectSession(s.session_id)
                        setIsOpen(false)
                      }
                    }}
                    className={`group relative rounded-xl p-2.5 transition flex items-center gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/15 border border-indigo-500/40 text-white'
                        : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border relative ${
                        isActive
                          ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {isDisplay ? (
                        <Monitor className="w-4 h-4" />
                      ) : (
                        <AppWindow className="w-4 h-4" />
                      )}
                      {/* State indicator dot */}
                      {s.state === 'running' ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 ring-2 ring-slate-900 animate-pulse" />
                      ) : s.state === 'waiting_approval' ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 ring-2 ring-slate-900 animate-pulse" />
                      ) : s.state === 'error' ? (
                        <span className="w-2 h-2 rounded-full bg-rose-400 absolute -top-0.5 -right-0.5 ring-2 ring-slate-900" />
                      ) : null}
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleSaveRename(e, s.session_id)}
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            disabled={isSubmitting}
                            className="flex-1 bg-slate-950 text-slate-100 text-xs px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                            placeholder={t('sessions.editTitle')}
                          />
                          <button
                            type="submit"
                            disabled={isSubmitting || !editingTitle.trim()}
                            className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40"
                            title={t('sessions.save')}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title={t('sessions.cancel')}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold truncate text-slate-100">
                              {s.title || s.target_title || s.session_id}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30 uppercase tracking-wider shrink-0">
                                {t('sessions.active')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span className="font-mono text-slate-400">
                              #{s.session_id.slice(0, 8)}
                            </span>
                            <span>•</span>
                            <span>
                              {s.turn_count} {t('sessions.turns')}
                            </span>
                            <span>•</span>
                            <span>
                              {s.total_steps} {t('sessions.steps')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Action Buttons */}
                    {!isEditing && (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isDeleting ? (
                          <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-600/50 p-1 rounded-lg animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={(e) => handleConfirmDelete(e, s.session_id)}
                              disabled={isSubmitting}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-medium transition cursor-pointer flex items-center gap-1"
                              title={t('sessions.confirmDelete')}
                            >
                              {isSubmitting ? (
                                <RotateCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span>{t('sessions.delete')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelDelete}
                              className="p-1 rounded text-slate-400 hover:text-slate-200 transition"
                              title={t('sessions.cancel')}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                              title={t('sessions.rename')}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleStartDelete(e, s.session_id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                              title={t('sessions.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* 3. Popover Footer */}
          <div className="p-2.5 px-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] text-slate-400">
              {t('sessions.total').replace('{count}', String(sessions.length))}
            </span>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onOpenNewSessionModal()
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{t('sessions.new')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
