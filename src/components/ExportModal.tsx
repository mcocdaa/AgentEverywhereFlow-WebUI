import React, { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Download, FileCode, FileJson, FileText, X } from 'lucide-react'
import type { SessionDetail, SessionEvent } from '../api/types'
import { useLanguage } from '../i18n/LanguageContext'

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
  const { t } = useLanguage()
  const [format, setFormat] = useState<'python' | 'yaml' | 'markdown' | 'json'>('python')
  const [copied, setCopied] = useState(false)
  const [content, setContent] = useState('')

  const buildContent = useCallback((fmt: 'python' | 'yaml' | 'markdown' | 'json') => {
    if (!session) return ''
    const timestamp = Date.now()
    const nowIso = new Date(timestamp).toISOString()
    const nowLocale = new Date(timestamp).toLocaleString()

    const isEventRejected = (idx: number): boolean => {
      const ev = events[idx]
      if (!ev || ev.payload.rejected === true) return true
      for (let i = idx + 1; i < events.length; i++) {
        const nextEv = events[i]
        if (nextEv.event_type === 'action_proposed' || nextEv.event_type === 'turn_start') {
          break
        }
        if (nextEv.event_type === 'action_executed' && nextEv.payload.rejected === true) {
          return true
        }
      }
      return false
    }

    const extractActionDetails = (ev: SessionEvent) => {
      const code = typeof ev.payload.code === 'string' ? ev.payload.code.trim() : undefined
      const guardedPayload =
        ev.payload.payload && typeof ev.payload.payload === 'object'
          ? (ev.payload.payload as Record<string, unknown>)
          : undefined
      const action =
        (guardedPayload?.action as string | undefined) ||
        (ev.payload.action as string | undefined)
      const params: Record<string, unknown> | undefined =
        (ev.payload.params as Record<string, unknown> | undefined) ||
        (guardedPayload?.params && typeof guardedPayload.params === 'object'
          ? (guardedPayload.params as Record<string, unknown>)
          : guardedPayload
          ? Object.fromEntries(Object.entries(guardedPayload).filter(([k]) => k !== 'action'))
          : undefined)
      return { code, action, params }
    }

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
      events.forEach((ev, idx) => {
        if (ev.event_type === 'action_proposed') {
          if (isEventRejected(idx)) return
          const { code, action, params } = extractActionDetails(ev)
          if (code) {
            actions.push(code)
          } else if (action) {
            const args = params
              ? Object.entries(params)
                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                  .join(', ')
              : ''
            actions.push(`driver.${action}(${args})`)
          }
        }
      })

      const formattedActions =
        actions.length > 0
          ? actions
              .map((act) => {
                const indented = act
                  .split('\n')
                  .map((line) => (line.trim().length > 0 ? `    ${line}` : ''))
                  .join('\n')
                return `${indented}\n    time.sleep(0.5)`
              })
              .join('\n')
          : '    # No actions recorded in this session yet\n    pass'

      return `"""
AgentEverywhereFlow Replayable Workflow Script
Session ID: ${session.session_id}
Target: ${session.target.title} (${session.target.rect.width}x${session.target.rect.height})
Generated at: ${nowIso}
"""

import time
from agenteverywhereflow.actions.driver import driver
from agenteverywhereflow.actions.coords import CoordinateProjector
from agenteverywhereflow.capturer.base import Rect, TargetInfo, TargetType
try:
    from agenteverywhereflow.capturer import get_capturer
except ImportError:
    from agenteverywhereflow.capturer.base import get_capturer


def run_workflow():
    print("Initializing workflow for target '${session.target.title}'...")
    capturer = get_capturer()
    _ = (capturer, CoordinateProjector, Rect, TargetInfo, TargetType)
    click = driver.click
    double_click = driver.double_click
    right_click = driver.right_click
    move = driver.move_to
    drag = driver.drag
    type_text = driver.type_text
    press = driver.press_key
    hotkey = driver.hotkey
    scroll = driver.scroll
    wait = driver.wait

    # Replay executed agent actions
${formattedActions}

    print("Workflow replay completed successfully.")


if __name__ == "__main__":
    run_workflow()
`
    }

    if (fmt === 'yaml') {
      const yamlSteps: string[] = []
      let stepCounter = 1
      events.forEach((ev, idx) => {
        if (ev.event_type === 'action_proposed') {
          if (isEventRejected(idx)) return
          const { code, action, params } = extractActionDetails(ev)
          if (code) {
            const indentedCode = code
              .split('\n')
              .map((line) => `      ${line}`)
              .join('\n')
            yamlSteps.push(
              `  - step_number: ${stepCounter}\n` +
                `    action: "codeact"\n` +
                `    target: ${JSON.stringify(session.target.title)}\n` +
                `    code: |\n${indentedCode}`
            )
            stepCounter += 1
          } else if (action) {
            yamlSteps.push(
              `  - step_number: ${stepCounter}\n` +
                `    action: ${JSON.stringify(action)}\n` +
                `    target: ${JSON.stringify(session.target.title)}\n` +
                `    params: ${JSON.stringify(params || {})}`
            )
            stepCounter += 1
          }
        }
      })

      return `name: ${JSON.stringify(`workflow_${session.session_id}`)}
description: ${JSON.stringify(`Replayable workflow exported from dialogue session '${session.session_id}'`)}
version: "1.0"
created_at: ${Math.floor(timestamp / 1000)}
targets:
  - target_id: ${JSON.stringify(session.target.target_id)}
    title: ${JSON.stringify(session.target.title)}
    rect:
      x: ${session.target.rect.x ?? 0}
      y: ${session.target.rect.y ?? 0}
      width: ${session.target.rect.width}
      height: ${session.target.rect.height}
${yamlSteps.length > 0 ? `steps:\n${yamlSteps.join('\n')}` : 'steps: []'}
metadata:
  session_id: ${JSON.stringify(session.session_id)}
  mode: ${JSON.stringify(session.mode)}
  total_turns: ${session.turn_count}
  total_steps: ${session.total_steps}
  exported_at: ${JSON.stringify(nowIso)}
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
        const { code, action, params } = extractActionDetails(ev)
        md += `#### ⚡ Proposed Action\n\n\`\`\`python\n${
          code || `${action || 'action'}(${JSON.stringify(params || {})})`
        }\n\`\`\`\n\n`
      } else if (ev.event_type === 'action_executed') {
        md += `- **Execution Output**: \`${
          ev.payload.rejected ? 'REJECTED' : ev.payload.success ? 'SUCCESS' : 'FAILED'
        }\`\n`
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
    const ext =
      format === 'json'
        ? 'json'
        : format === 'python'
        ? 'py'
        : format === 'yaml'
        ? 'yaml'
        : 'md'
    const mime =
      format === 'json'
        ? 'application/json'
        : format === 'python'
        ? 'text/x-python'
        : format === 'yaml'
        ? 'text/yaml'
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
              <h3 className="text-base font-semibold text-white">{t('export.title')}</h3>
              <p className="text-xs text-slate-400">{t('export.subtitle')}</p>
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
        <div className="px-6 pt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFormat('python')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              format === 'python'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{t('export.tabPython')}</span>
          </button>

          <button
            onClick={() => setFormat('yaml')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              format === 'yaml'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{t('export.tabYaml')}</span>
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
            <span>{t('export.tabMarkdown')}</span>
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
              <span>{copied ? t('export.copied') : t('export.copy')}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('export.download')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
