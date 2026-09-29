import React, { useState } from 'react'
import { Check, ShieldAlert, X } from 'lucide-react'
import type { PendingApproval } from '../api/types'

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
  const [rejectReason, setRejectReason] = useState('')
  const [showReasonInput, setShowReasonInput] = useState(false)

  if (!pending) return null

  const handleReject = () => {
    onReject(rejectReason || undefined)
    setRejectReason('')
    setShowReasonInput(false)
  }

  return (
    <div className="fixed bottom-24 right-8 z-50 w-96 max-w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Operator Approval Required
          </h4>
          <p className="text-[11px] text-slate-400">Agent proposed OS input injection</p>
        </div>
      </div>

      {/* Action Details */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-3 space-y-1.5 font-mono text-xs">
        <div className="flex justify-between items-center text-slate-400 text-[11px]">
          <span>ACTION:</span>
          <span className="text-amber-400 font-bold uppercase">{pending.action}</span>
        </div>

        {Object.keys(pending.params || {}).length > 0 && (
          <div className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800/80 overflow-x-auto">
            {JSON.stringify(pending.params, null, 2)}
          </div>
        )}

        {pending.code_snippet && (
          <div className="mt-2 text-[10px] text-indigo-300 bg-indigo-950/40 p-2 rounded border border-indigo-500/30 overflow-x-auto whitespace-pre font-mono">
            {pending.code_snippet}
          </div>
        )}
      </div>

      {/* Rejection reason toggle */}
      {showReasonInput && (
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Optional reason for agent correction..."
          className="w-full mb-3 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          autoFocus
        />
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApprove}
          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Approve Action</span>
        </button>

        {showReasonInput ? (
          <button
            onClick={handleReject}
            className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Confirm Reject</span>
          </button>
        ) : (
          <button
            onClick={() => setShowReasonInput(true)}
            className="py-2 px-3 bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
          >
            Reject...
          </button>
        )}
      </div>
    </div>
  )
}
