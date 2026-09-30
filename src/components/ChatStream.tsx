import React, { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  BrainCircuit,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code2,
  Play,
  Sparkles,
  Terminal,
  User,
  Zap,
} from 'lucide-react'
import type { SessionEvent } from '../api/types'

interface ChatStreamProps {
  events: SessionEvent[]
  isExecuting: boolean
}

export const ChatStream: React.FC<ChatStreamProps> = ({ events, isExecuting }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({})

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(atBottom)
  }

  const toggleThinking = (key: string) => {
    setExpandedThinking((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderToolCallBadge = (line: string, idx: number) => {
    const clean = line.replace(/^⚡\s*/, '').replace(/^\[Tool Call\]\s*/, '').trim()
    const [callPart, targetPart] = clean.split('──▶')

    return (
      <div
        key={idx}
        className="flex flex-wrap items-center gap-2 py-1 px-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono shadow-sm"
      >
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
          Tool Call
        </span>
        <span className="text-cyan-300 font-semibold">{callPart?.trim()}</span>
        {targetPart && (
          <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            ▶ {targetPart.trim()}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs select-text"
    >
      {events.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Session Ready</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Type an instruction below (e.g. &quot;Click search bar, type query, and press Enter&quot;) to initiate the agent loop.
            </p>
          </div>
        </div>
      ) : (
        events.map((ev, index) => {
          const key = `${ev.timestamp}-${index}`

          switch (ev.event_type) {
            case 'turn_start': {
              const instruction = ev.payload.instruction as string
              return (
                <div key={key} className="flex gap-3 justify-end items-start animate-in fade-in duration-150">
                  <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-md">
                    <div className="text-[10px] font-semibold text-indigo-200 mb-0.5">OPERATOR</div>
                    <div className="text-xs leading-relaxed whitespace-pre-wrap">{instruction}</div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              )
            }

            case 'reasoning': {
              const thinking = ((ev.payload.thinking || ev.payload.content) as string) || ''
              const isExpanded = expandedThinking[key] ?? true
              if (!thinking.trim()) return null

              return (
                <div key={key} className="flex gap-3 items-start animate-in fade-in duration-150">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 mt-0.5">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-slate-900 border border-purple-500/20 rounded-2xl rounded-tl-sm overflow-hidden shadow-sm">
                    <div
                      onClick={() => toggleThinking(key)}
                      className="px-3 py-2 bg-purple-950/20 flex items-center justify-between cursor-pointer select-none border-b border-purple-500/10 hover:bg-purple-950/30 transition"
                    >
                      <div className="flex items-center gap-2 text-purple-300 font-semibold text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Agent Reasoning / Chain-of-Thought</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.step ? (
                          <span className="text-[10px] text-purple-400/70 font-mono">Step {ev.step}</span>
                        ) : null}
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-3 text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/60 font-sans">
                        {thinking}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            case 'action_proposed': {
              const code = ev.payload.code as string | undefined
              const action = ev.payload.action as string | undefined
              const params = ev.payload.params as Record<string, unknown> | undefined

              return (
                <div key={key} className="flex gap-3 items-start animate-in fade-in duration-150">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 mt-0.5">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-slate-900 border border-amber-500/30 rounded-2xl rounded-tl-sm overflow-hidden shadow-sm">
                    <div className="px-3 py-1.5 bg-amber-950/20 flex items-center justify-between border-b border-amber-500/20">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 font-semibold">
                        <Play className="w-3 h-3 text-amber-400" />
                        <span>⚡ {code ? 'Executing CodeAct Action Block' : `Action: ${action}`}</span>
                      </div>
                      <span className="text-[10px] text-amber-400/80 font-mono">Step {ev.step}</span>
                    </div>

                    <div className="p-3 bg-slate-950 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                      {code ? (
                        <pre className="whitespace-pre">{code}</pre>
                      ) : (
                        <pre className="whitespace-pre">
                          {action}({JSON.stringify(params, null, 2)})
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            case 'action_executed': {
              const success = ev.payload.success as boolean
              const output = ev.payload.output as string | undefined
              const error = ev.payload.error as string | undefined
              const rejected = ev.payload.rejected as boolean | undefined
              const rawToolCalls = (ev.payload.tool_calls as string[] | undefined) || []

              // Also check if output itself contains tool calls
              const toolCalls = [...rawToolCalls]
              let remainingOutput = output || ''
              if (!rawToolCalls.length && output && output.includes('[Tool Call]')) {
                const lines = output.split('\n')
                const tcLines: string[] = []
                const otherLines: string[] = []
                for (const l of lines) {
                  if (l.includes('[Tool Call]')) {
                    tcLines.push(l)
                  } else {
                    otherLines.push(l)
                  }
                }
                toolCalls.push(...tcLines)
                remainingOutput = otherLines.join('\n').trim()
              }

              return (
                <div key={key} className="flex gap-3 items-start ml-6 animate-in fade-in duration-150">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {rejected ? (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    ) : success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold text-xs ${
                          rejected
                            ? 'text-amber-400'
                            : success
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {rejected
                          ? 'Action Rejected by Operator'
                          : success
                          ? '✅ Actions Executed Successfully'
                          : '❌ Execution Failed'}
                      </span>
                      {ev.step ? (
                        <span className="text-[10px] text-slate-500 font-mono">Step {ev.step}</span>
                      ) : null}
                    </div>

                    {/* Rich CLI-style Tool Call Items */}
                    {toolCalls.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        {toolCalls.map((tc, idx) => renderToolCallBadge(tc, idx))}
                      </div>
                    )}

                    {/* Standard text output if present */}
                    {remainingOutput && remainingOutput.trim() && (
                      <div className="font-mono text-[10px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed">
                        <div className="text-[9px] text-slate-500 font-bold mb-1">STDOUT</div>
                        {remainingOutput}
                      </div>
                    )}

                    {error && (
                      <div className="font-mono text-[10px] text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30 whitespace-pre-wrap leading-relaxed">
                        <div className="text-[9px] text-rose-400 font-bold mb-1">ERROR TRACE</div>
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            case 'task_completed': {
              const summary = ev.payload.summary as string
              return (
                <div key={key} className="flex gap-3 items-start animate-in fade-in duration-150">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
                    <div className="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                      <span>🎯 TASK COMPLETED</span>
                    </div>
                    <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {summary || 'Goal successfully reached.'}
                    </div>
                  </div>
                </div>
              )
            }

            case 'aborted': {
              const msg = (ev.payload.message as string) || 'Execution aborted by operator.'
              return (
                <div key={key} className="flex gap-3 items-start animate-in fade-in duration-150">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-rose-950/30 border border-rose-500/40 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
                    <div className="text-[11px] font-bold text-rose-300 mb-1 flex items-center gap-1.5">
                      <span>⏹ EXECUTION ABORTED (执行已终止)</span>
                    </div>
                    <div className="text-xs text-rose-200 leading-relaxed whitespace-pre-wrap">
                      {msg} Current turn stopped immediately. The target window and session remain ready for your next instruction.
                    </div>
                  </div>
                </div>
              )
            }

            case 'error': {
              const errorMsg = ev.payload.error as string
              return (
                <div key={key} className="flex gap-3 items-start animate-in fade-in duration-150">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-rose-950/30 border border-rose-500/40 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
                    <div className="text-[11px] font-bold text-rose-300 mb-1">EXECUTION ERROR</div>
                    <div className="text-xs text-rose-200 font-mono whitespace-pre-wrap leading-relaxed">
                      {errorMsg}
                    </div>
                  </div>
                </div>
              )
            }

            default:
              return null
          }
        })
      )}

      {/* Active Running Pulse Indicator */}
      {isExecuting && (
        <div className="flex items-center gap-2.5 text-xs text-indigo-300 bg-indigo-950/30 border border-indigo-500/30 px-3 py-2 rounded-xl animate-pulse">
          <Terminal className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Agent is reasoning and executing actions...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
