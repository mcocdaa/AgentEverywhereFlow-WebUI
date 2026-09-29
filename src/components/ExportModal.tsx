import React, { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Download, FileCode, FileJson, FileText, X } from 'lucide-react'
import type { SessionDetail, SessionEvent } from '../api/types'

interface ExportModalProps {
  isOpen: boolean
  session: SessionDetail | null
  events: SessionEvent[]
  onClose: () => void
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  session,
  events,
  onClose,
}) => {
  const [format, setFormat] = useState<'json' | 'python' | 'markdown'>('python')
  const [copied, setCopied] = useState(false)
  const [content, setContent] = useState('')

  const buildContent = useCallback((fmt: 'json' | 'python' | 'markdown') => {
    if (!session) return ''
    const timestamp = Date.now()
    const nowIso = new Date(timestamp).toISOString()
    const nowLocale = new Date(timestamp).toLocaleString()

    if (fmt === 'json') {
      return JSON.stringify(
        {
          session_id: session.session_id,
          target: session.target,
          mode: session.mode,
          turn_count: session.turn_count,
          total_steps: session.total_steps,
          exported_at: nowIso,
          events: events,
        },
        null,
        2
      )
    }

    if (fmt === 'python') {
      const actions: string[] = []
      events.forEach((ev) => {
        if (ev.event_type === 'action_proposed') {
          const code = ev.payload.code as string | undefined
          const action = ev.payload.action as string | undefined
          const params = ev.payload.params as Record<string, unknown> | undefined
          if (code) {
            actions.push(code.trim())
          } else if (action && params) {
            const args = Object.entries(params)
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .join(', ')
            actions.push(`${action}(${args})`)
          }
        }
      })

      return `"""
AgentEverywhereFlow Replayable Workflow Script
Session ID: ${session.session_id}
Target: ${session.target.title} (${session.target.rect.width}x${session.target.rect.height})
Generated at: ${nowIso}
"""

import time
from agenteverywhereflow.actions.driver import ActionDriver
from agenteverywhereflow.actions.coords import CoordinateProjector
from agenteverywhereflow.capturer.selector import TargetInfo, Rect, TargetType

def run_workflow():
    print("Initializing ActionDriver for target '${session.target.title}'...")
    driver = ActionDriver()

    # Replay executed agent actions
${
  actions.length > 0
    ? actions.map((act) => `    ${act}\n    time.sleep(0.5)`).join('\n')
    : '    # No actions recorded in this session yet\n    pass'
}

    print("Workflow replay completed successfully.")

if __name__ == "__main__":
    run_workflow()
`
    }

    // Markdown format
    let md = `# AgentEverywhereFlow Execution Audit Report\n\n`
    md += `- **Session ID**: \`${session.session_id}\`\n`
    md += `- **Target Window**: ${session.target.title} (${session.target.rect.width}×${session.target.rect.height})\n`
    md += `- **Execution Mode**: \`${session.mode}\`\n`
    md += `- **Total Turns**: ${session.turn_count}\n`
    md += `- **Total Steps**: ${session.total_steps}\n`
    md += `- **Export Date**: ${nowLocale}\n\n`
    md += `## Interaction Trace\n\n`

    events.forEach((ev) => {
      if (ev.event_type === 'turn_start') {
        md += `### 🎯 Operator Instruction (Turn ${ev.payload.turn || 1})\n\n> ${ev.payload.instruction}\n\n`
      } else if (ev.event_type === 'reasoning') {
        md += `#### 🧠 Reasoning (Step ${ev.step})\n\n${ev.payload.thinking}\n\n`
      } else if (ev.event_type === 'action_proposed') {
        md += `#### ⚡ Proposed Action\n\n\`\`\`python\n${
          ev.payload.code || `${ev.payload.action}(${JSON.stringify(ev.payload.params)})`
        }\n\`\`\`\n\n`
      } else if (ev.event_type === 'action_executed') {
        md += `- **Execution Output**: \`${ev.payload.success ? 'SUCCESS' : 'FAILED'}\`\n`
        if (ev.payload.output) md += `  \`\`\`\n  ${ev.payload.output}\n  \`\`\`\n`
        md += `\n`
      } else if (ev.event_type === 'task_completed') {
        md += `### ✅ Task Completed\n\n${ev.payload.summary}\n\n---\n\n`
      }
    })

    return md
  }, [session, events])

  useEffect(() => {
    if (isOpen) {
      setContent(buildContent(format))
    }
  }, [isOpen, format, buildContent])

  if (!isOpen || !session) return null

  const handleCopy = () => {
    const text = buildContent(format)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const text = buildContent(format)
    const ext = format === 'json' ? 'json' : format === 'python' ? 'py' : 'md'
    const mime =
      format === 'json'
        ? 'application/json'
        : format === 'python'
        ? 'text/x-python'
        : 'text/markdown'
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aef-${session.session_id.slice(0, 8)}-workflow.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Export Workflow & Trace</h3>
              <p className="text-xs text-slate-400">
                Export session actions as executable automation or audit report
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

        {/* Format Selector Tabs */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setFormat('python')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              format === 'python'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Python Script (.py)</span>
          </button>

          <button
            onClick={() => setFormat('markdown')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              format === 'markdown'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Report (.md)</span>
          </button>

          <button
            onClick={() => setFormat('json')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              format === 'json'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>JSON Trace (.json)</span>
          </button>
        </div>

        {/* Code Preview */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 overflow-y-auto whitespace-pre">
            {content}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            {events.length} session events recorded
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
