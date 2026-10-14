import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type {
  ActionMarker,
  PendingApproval,
  PermissionMode,
  SessionDetail,
  SessionEvent,
} from '../api/types'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

function getEventKey(ev: SessionEvent): string {
  const idDisc =
    (ev.payload?.id as string | undefined) ||
    (ev.payload?.request_id as string | undefined) ||
    JSON.stringify(ev.payload ?? {})
  return `${ev.timestamp}-${ev.event_type}-${ev.step}-${idDisc}`
}

export function useSessionSocket(
  sessionId: string | null,
  onNewActionMarker?: (marker: ActionMarker) => void,
  onScreenshotRefresh?: () => void,
  onSessionUpdated?: (detail: SessionDetail) => void
) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentTurn, setCurrentTurn] = useState<number>(0)
  const [currentStep, setCurrentStep] = useState<number>(0)

  const socketRef = useRef<WebSocket | null>(null)
  const boundSessionIdRef = useRef<string | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const activeSessionIdRef = useRef<string | null>(sessionId)

  useEffect(() => {
    activeSessionIdRef.current = sessionId
  }, [sessionId])

  // Load session history and reset state when session changes
  useEffect(() => {
    setEvents([])
    setPendingApproval(null)
    setIsExecuting(false)
    setCurrentTurn(0)
    setCurrentStep(0)

    if (!sessionId) return

    let cancelled = false
    api
      .getSessionHistory(sessionId)
      .then((history) => {
        if (cancelled) return
        if (history && Array.isArray(history.events)) {
          setEvents((prev) => {
            if (prev.length === 0) return history.events
            const seen = new Set<string>()
            const merged: SessionEvent[] = []
            for (const e of [...history.events, ...prev]) {
              const k = getEventKey(e)
              if (!seen.has(k)) {
                seen.add(k)
                merged.push(e)
              }
            }
            merged.sort((a, b) => a.timestamp - b.timestamp)
            return merged
          })
          if (history.turn_count) setCurrentTurn((prev) => Math.max(prev, history.turn_count))
          if (history.total_steps) setCurrentStep((prev) => Math.max(prev, history.total_steps))
        }
      })
      .catch((err) => {
        console.warn(`Failed to fetch history for session '${sessionId}':`, err)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    let isCleanedUp = false
    const currentTargetSessionId = sessionId

    if (!currentTargetSessionId) {
      if (socketRef.current) {
        const ws = socketRef.current
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        try {
          ws.close()
        } catch {
          // ignore
        }
        socketRef.current = null
        boundSessionIdRef.current = null
      }
      setStatus('disconnected')
      return
    }

    const connect = () => {
      if (isCleanedUp || activeSessionIdRef.current !== currentTargetSessionId) return

      // Clean up previous socket if any before connecting new one
      if (socketRef.current) {
        const prev = socketRef.current
        prev.onopen = null
        prev.onmessage = null
        prev.onerror = null
        prev.onclose = null
        try {
          prev.close()
        } catch {
          // ignore
        }
        socketRef.current = null
        boundSessionIdRef.current = null
      }

      setStatus('connecting')
      const wsUrl = api.getWebSocketUrl(currentTargetSessionId)
      const ws = new WebSocket(wsUrl)
      socketRef.current = ws
      boundSessionIdRef.current = currentTargetSessionId

      ws.onopen = () => {
        if (isCleanedUp || activeSessionIdRef.current !== currentTargetSessionId) return
        setStatus('connected')
      }

      ws.onmessage = (event) => {
        if (isCleanedUp || activeSessionIdRef.current !== currentTargetSessionId) return
        try {
          const ev: SessionEvent = JSON.parse(event.data)

          // Strictly drop events meant for other sessions
          if (ev.session_id && ev.session_id !== currentTargetSessionId) {
            console.warn(
              `[AEFlow WS] Dropping event for mismatched session: ${ev.session_id} (active: ${currentTargetSessionId})`
            )
            return
          }

          setEvents((prev) => {
            const evKey = getEventKey(ev)
            if (prev.some((p) => getEventKey(p) === evKey)) {
              return prev
            }
            return [...prev, ev]
          })

          if (ev.step !== undefined) {
            setCurrentStep(ev.step)
          }

          // Handle specific event types
          switch (ev.event_type) {
            case 'turn_start': {
              setIsExecuting(true)
              const turnNum = typeof ev.payload.turn === 'number' ? ev.payload.turn : 1
              setCurrentTurn(turnNum)
              break
            }
            case 'observe': {
              onScreenshotRefresh?.()
              break
            }
            case 'action_proposed': {
              const innerPayload =
                ev.payload.payload && typeof ev.payload.payload === 'object'
                  ? (ev.payload.payload as Record<string, unknown>)
                  : undefined
              const action =
                (innerPayload?.action as string | undefined) ||
                (ev.payload.action as string | undefined)
              const params =
                (innerPayload?.params as Record<string, unknown> | undefined) ||
                (ev.payload.params as Record<string, unknown> | undefined) ||
                innerPayload
              const rawX = params?.x ?? params?.from_x
              const rawY = params?.y ?? params?.from_y
              if (action && typeof rawX === 'number' && typeof rawY === 'number') {
                onNewActionMarker?.({
                  id: `${Date.now()}-${Math.random()}`,
                  x: rawX,
                  y: rawY,
                  action,
                  timestamp: Date.now(),
                })
              }

              const code = ev.payload.code as string | undefined
              if (typeof code === 'string' && code.trim()) {
                const coordRegex =
                  /\b(click|double_click|right_click|move|drag)\s*\(\s*(?:(?:x|from_x)\s*=\s*)?([0-9]+(?:\.[0-9]+)?)\s*,\s*(?:(?:y|from_y)\s*=\s*)?([0-9]+(?:\.[0-9]+)?)/g
                for (const match of code.matchAll(coordRegex)) {
                  const matchedAction = match[1]
                  const mx = Number(match[2])
                  const my = Number(match[3])
                  if (!Number.isNaN(mx) && !Number.isNaN(my)) {
                    onNewActionMarker?.({
                      id: `${Date.now()}-${Math.random()}`,
                      x: mx,
                      y: my,
                      action: matchedAction,
                      timestamp: Date.now(),
                    })
                  }
                }
              }
              break
            }
            case 'action_executed': {
              // Trigger a fresh viewport snapshot after an action is executed!
              onScreenshotRefresh?.()
              break
            }
            case 'approval_required': {
              setPendingApproval({
                action: (ev.payload.action_type || ev.payload.action || 'unknown') as string,
                params: ((ev.payload.details || ev.payload.params || {}) as Record<string, unknown>),
                context: ((ev.payload.description || ev.payload.context || '') as string),
                code_snippet: (ev.payload.code_snippet as string | undefined),
                requested_at: Date.now(),
              })
              break
            }
            case 'approval_resolved': {
              setPendingApproval(null)
              break
            }
            case 'turn_finished':
            case 'task_completed':
            case 'aborted': {
              setIsExecuting(false)
              setPendingApproval(null)
              onScreenshotRefresh?.()
              api
                .getSession(currentTargetSessionId)
                .then((detail) => {
                  if (isCleanedUp || activeSessionIdRef.current !== currentTargetSessionId) return
                  setCurrentTurn(detail.turn_count)
                  setCurrentStep(detail.total_steps)
                  onSessionUpdated?.(detail)
                })
                .catch((err) => {
                  console.warn('Failed to refresh session metadata:', err)
                })
              break
            }
            case 'error': {
              setIsExecuting(false)
              setPendingApproval(null)
              const errMsg = String(ev.payload?.error || '')
              if (!errMsg.toLowerCase().includes('not found')) {
                onScreenshotRefresh?.()
              }
              break
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onclose = (event: CloseEvent) => {
        if (isCleanedUp || activeSessionIdRef.current !== currentTargetSessionId) return
        setStatus('disconnected')

        // Stop reconnect loop if session was rejected by server policy / does not exist
        if (event.code === 1008 || event.code === 4404) {
          console.warn(
            `[AEFlow WS] Session '${currentTargetSessionId}' was closed by server (code ${event.code}): ${event.reason || 'session not found'}. Stopping reconnect loop.`
          )
          return
        }

        // Reconnect after 3 seconds ONLY if still mounted and active
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (!isCleanedUp && activeSessionIdRef.current === currentTargetSessionId) {
            connect()
          }
        }, 3000)
      }

      ws.onerror = (err) => {
        if (isCleanedUp || activeSessionIdRef.current !== currentTargetSessionId) return
        console.warn(`[AEFlow WS] WebSocket error on session '${currentTargetSessionId}':`, err)
        ws.close()
      }
    }

    connect()

    return () => {
      isCleanedUp = true
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (socketRef.current) {
        const ws = socketRef.current
        // Remove event handlers to prevent lingering zombie callbacks
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        try {
          ws.close()
        } catch {
          // ignore
        }
        socketRef.current = null
        boundSessionIdRef.current = null
      }
    }
  }, [sessionId, onNewActionMarker, onScreenshotRefresh, onSessionUpdated])

  const sendInstruction = useCallback(
    (instruction: string, maxSteps = 50) => {
      const curId = activeSessionIdRef.current
      if (!curId) return

      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN &&
        boundSessionIdRef.current === curId
      ) {
        socketRef.current.send(
          JSON.stringify({
            action: 'message',
            instruction,
            max_steps: maxSteps,
          })
        )
        setIsExecuting(true)
      } else {
        // Fallback to REST API strictly for curId
        setIsExecuting(true)
        api
          .sendMessage(curId, { instruction, max_steps: maxSteps, async_execution: true })
          .catch((err) => {
            console.error(`Failed to send instruction to session '${curId}' via REST fallback:`, err)
            setIsExecuting(false)
          })
      }
    },
    []
  )

  const submitApproval = useCallback(
    (approved: boolean, reason?: string) => {
      const curId = activeSessionIdRef.current
      if (!curId) return

      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN &&
        boundSessionIdRef.current === curId
      ) {
        socketRef.current.send(
          JSON.stringify({
            action: 'approval',
            approved,
            reason,
          })
        )
      } else {
        api.submitApproval(curId, { approved, reason }).catch(console.error)
      }
      setPendingApproval(null)
    },
    []
  )

  const setPermissionMode = useCallback(
    (mode: PermissionMode) => {
      const curId = activeSessionIdRef.current
      if (!curId) return

      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN &&
        boundSessionIdRef.current === curId
      ) {
        socketRef.current.send(
          JSON.stringify({
            action: 'permission',
            mode,
          })
        )
      } else {
        api.updatePermission(curId, mode).catch(console.error)
      }
    },
    []
  )

  const abortExecution = useCallback(() => {
    const curId = activeSessionIdRef.current
    if (!curId) return

    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN &&
      boundSessionIdRef.current === curId
    ) {
      socketRef.current.send(
        JSON.stringify({
          action: 'abort',
        })
      )
    } else {
      api.abortSession(curId).catch((err) => {
        console.error(`Failed to abort session '${curId}' via REST:`, err)
      })
    }
    setIsExecuting(false)
    setPendingApproval(null)
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return {
    status,
    events,
    pendingApproval,
    isExecuting,
    currentTurn,
    currentStep,
    setPendingApproval,
    setIsExecuting,
    sendInstruction,
    abortExecution,
    submitApproval,
    setPermissionMode,
    clearEvents,
  }
}
