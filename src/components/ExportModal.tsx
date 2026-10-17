import React, { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Download, FileCode, FileJson, FileText, Play, X } from 'lucide-react'
import { api } from '../api/client'
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
  const { t, language } = useLanguage()
  const [format, setFormat] = useState<'python' | 'yaml' | 'markdown' | 'json'>('python')
  const [copied, setCopied] = useState(false)
  const [content, setContent] = useState('')
  const [replayStatus, setReplayStatus] = useState<{
    loading: boolean
    ok?: boolean
    message?: string
  }>({ loading: false })

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
    if (language === 'zh') {
      const modeZh =
        session.mode === 'minimal'
          ? '极简模式'
          : session.mode === 'guarded'
          ? '受控模式'
          : session.mode
      let md = `# AgentEverywhereFlow 执行审计报告\n\n`
      md += `- **会话 ID**: \`${session.session_id}\`\n`
      md += `- **目标窗口**: ${session.target.title} (${session.target.rect.width}×${session.target.rect.height})\n`
      md += `- **执行模式**: \`${modeZh}\`\n`
      md += `- **总轮次**: ${session.turn_count}\n`
      md += `- **总步数**: ${session.total_steps}\n`
      md += `- **导出时间**: ${nowLocale}\n\n`
      md += `## 交互轨迹\n\n`

      events.forEach((ev) => {
        if (ev.event_type === 'turn_start') {
          md += `### 🎯 操作员指令 (第 ${ev.payload.turn || 1} 轮)\n\n> ${ev.payload.instruction}\n\n`
        } else if (ev.event_type === 'reasoning') {
          md += `#### 🧠 智能体推理 (步骤 ${ev.step})\n\n${ev.payload.thinking}\n\n`
        } else if (ev.event_type === 'action_proposed') {
          const { code, action, params } = extractActionDetails(ev)
          md += `#### ⚡ 提议动作\n\n\`\`\`python\n${
            code || `${action || 'action'}(${JSON.stringify(params || {})})`
          }\n\`\`\`\n\n`
        } else if (ev.event_type === 'action_executed') {
          md += `- **执行结果**: \`${
            ev.payload.rejected ? '已拒绝' : ev.payload.success ? '成功' : '失败'
          }\`\n`
          if (ev.payload.output) md += `  \`\`\`\n  ${ev.payload.output}\n  \`\`\`\n`
          md += `\n`
        } else if (ev.event_type === 'task_completed') {
          md += `### ✅ 任务完成\n\n${ev.payload.summary}\n\n---\n\n`
        }
      })

      return md
    }

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
  }, [session, events, language])

  useEffect(() => {
    if (!isOpen || !session) return
    let cancelled = false
    const fallback = buildContent(format)
    setContent(fallback)

    if (format === 'python' || format === 'yaml' || (format === 'markdown' && language === 'en')) {
      api
        .exportSession(session.session_id, format)
        .then((res) => {
          if (!cancelled && res.content && res.content.trim().length > 0) {
            setContent(res.content)
          }
        })
        .catch(() => {
          // Offline or API error: keep local fallback content
        })
    }

    return () => {
      cancelled = true
    }
  }, [isOpen, format, session, buildContent, language])

  if (!isOpen || !session) return null

  const handleCopy = () => {
    const text = content || buildContent(format)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const text = content || buildContent(format)
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

  const handleReplayViaApi = async (dryRun = true) => {
    setReplayStatus({ loading: true })
    try {
      const res = await api.runWorkflow({
        session_id: session.session_id,
        dry_run: dryRun,
      })
      const stepCount = res.steps_executed ?? res.steps ?? 0
      setReplayStatus({
        loading: false,
        ok: res.status !== 'failed',
        message:
          res.status === 'dry_run'
            ? t('export.dryRunValidated').replace('{count}', String(stepCount))
            : res.status === 'completed'
            ? t('export.replayedSuccess').replace('{count}', String(stepCount))
            : `${t('export.workflowStatus').replace('{status}', res.status)}${res.error ? ` (${res.error})` : ''}`,
      })
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : ''
      const isGenericErr =
        !rawMsg || /^(Failed to fetch|NetworkError|HTTP \d+|Load failed)/i.test(rawMsg)
      setReplayStatus({
        loading: false,
        ok: false,
        message:
          language === 'zh' && isGenericErr
            ? t('export.error')
            : rawMsg || t('export.error'),
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 lg:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
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
        <div className="px-6 pt-3.5 lg:pt-4 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setFormat('python')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              format === 'python'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 shrink-0" />
            <span>{t('export.tabPython')}</span>
          </button>

          <button
            onClick={() => setFormat('yaml')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              format === 'yaml'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 shrink-0" />
            <span>{t('export.tabYaml')}</span>
          </button>

          <button
            onClick={() => setFormat('markdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              format === 'markdown'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>{t('export.tabMarkdown')}</span>
          </button>

          <button
            onClick={() => setFormat('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              format === 'json'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 shrink-0" />
            <span>{t('export.tabJson')}</span>
          </button>
        </div>

        {/* Code Preview */}
        <div className="p-4 lg:p-6 flex-1 min-h-0 overflow-hidden flex flex-col gap-2.5 lg:gap-3">
          {replayStatus.message && (
            <div
              className={`px-3.5 py-2 rounded-lg text-xs font-mono border shrink-0 ${
                replayStatus.ok
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/30 text-rose-300'
              }`}
            >
              {replayStatus.message}
            </div>
          )}
          <div className="flex-1 min-h-0 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 overflow-y-auto whitespace-pre">
            {content}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 lg:py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap shrink-0">
            {t('export.eventsRecorded').replace('{count}', String(events.length))}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleReplayViaApi(true)}
              disabled={replayStatus.loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-800/60 border border-emerald-500/30 whitespace-nowrap shrink-0 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>{replayStatus.loading ? t('export.validating') : t('export.dryRunReplay')}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span>{copied ? t('export.copied') : t('export.copy')}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{t('export.download')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

