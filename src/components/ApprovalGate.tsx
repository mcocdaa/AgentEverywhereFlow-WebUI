import React, { useState } from 'react'
import { Check, ShieldAlert, X } from 'lucide-react'
import type { PendingApproval } from '../api/types'
import { useLanguage } from '../i18n/LanguageContext'

interface ApprovalGateProps {
  pending: PendingApproval | null
  onApprove: () => void
  onReject: (reason?: string) => void
}

export const ApprovalGate: React.FC<ApprovalGateProps> = ({
  pending,
  onApprove,
  onReject,
}) => {
  const { t } = useLanguage()
  const [rejectReason, setRejectReason] = useState('')
  const [showReasonInput, setShowReasonInput] = useState(false)

  if (!pending) return null

  const actionName = pending.action || pending.action_type || 'unknown'
  const actionParams = pending.params || pending.details || {}
  const actionContext = pending.context || pending.description || ''

  const handleReject = () => {
    onReject(rejectReason || undefined)
    setRejectReason('')
    setShowReasonInput(false)
  }

  return (
    <div className="w-full shrink-0 bg-slate-900 border-t-2 border-amber-500/80 p-2.5 lg:p-3.5 shadow-[0_-10px_28px_rgba(245,158,11,0.18)] animate-in fade-in slide-in-from-bottom-3 duration-200 select-none">
      <div className="flex items-center justify-between gap-2 mb-1.5 lg:mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
            <ShieldAlert className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] lg:text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">
              {t('approval.title')}
            </h4>
            <p className="text-[10px] text-slate-400 truncate">{t('approval.subtitle')}</p>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase truncate max-w-[115px] xl:max-w-none shrink-0">
          {actionName}
        </span>
      </div>

      {/* Action Details */}
      <div className="bg-slate-950 p-2 lg:p-2.5 rounded-xl border border-slate-800 mb-2 lg:mb-2.5 space-y-1 lg:space-y-1.5 font-mono text-xs">
        {actionContext && (
          <div className="text-[10px] lg:text-[11px] text-slate-200 font-sans leading-snug">
            {actionContext}
          </div>
        )}

        {pending.code_snippet ? (
          <div className="text-[10px] text-indigo-300 bg-indigo-950/40 px-2 py-1 lg:px-2.5 lg:py-1.5 rounded border border-indigo-500/30 overflow-x-auto whitespace-pre font-mono leading-snug">
            {pending.code_snippet}
          </div>
        ) : (
          Object.keys(actionParams).length > 0 && (
            <div className="text-[10px] text-slate-300 bg-slate-900 px-2 py-1 lg:px-2.5 lg:py-1.5 rounded border border-slate-800/80 overflow-x-auto whitespace-pre">
              {JSON.stringify(actionParams)}
            </div>
          )
        )}
      </div>

      {/* Rejection reason toggle */}
      {showReasonInput && (
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('approval.placeholder')}
          className="w-full mb-2 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          autoFocus
        />
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApprove}
          className="flex-1 py-1.5 lg:py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 whitespace-nowrap shrink-0 transition cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{t('approval.approve')}</span>
        </button>

        {showReasonInput ? (
          <button
            onClick={handleReject}
            className="flex-1 py-1.5 lg:py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>{t('approval.confirmReject')}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowReasonInput(true)}
            className="py-1.5 lg:py-2 px-3.5 bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 font-semibold text-xs rounded-xl border border-slate-700 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            {t('approval.reject')}
          </button>
        )}
      </div>
    </div>
  )
}
