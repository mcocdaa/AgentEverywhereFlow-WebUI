import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { ActionMarker, PendingApproval, PermissionMode, SessionEvent } from '../api/types'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

export function useSessionSocket(
  sessionId: string | null,
  onNewActionMarker?: (marker: ActionMarker) => void,
  onScreenshotRefresh?: () => void
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
  activeSessionIdRef.current = sessionId

  // Clear events when session changes
  useEffect(() => {
    setEvents([])
    setPendingApproval(null)
    setIsExecuting(false)
    setCurrentTurn(0)
    setCurrentStep(0)
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

          setEvents((prev) => [...prev, ev])

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
            case 'action_proposed': {
              const action = ev.payload.action as string | undefined
              const params = ev.payload.params as Record<string, unknown> | undefined
              if (action && params && typeof params.x === 'number' && typeof params.y === 'number') {
                onNewActionMarker?.({
                  id: `${Date.now()}-${Math.random()}`,
                  x: params.x,
                  y: params.y,
                  action,
                  timestamp: Date.now(),
                })
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
                action: (ev.payload.action as string) || 'unknown',
                params: (ev.payload.params as Record<string, unknown>) || {},
                code_snippet: ev.payload.code_snippet as string | undefined,
                context: ev.payload.context as string | undefined,
                requested_at: Date.now(),
              })
              break
            }
            case 'approval_resolved': {
              setPendingApproval(null)
              break
            }
            case 'task_completed':
            case 'aborted': {
              setIsExecuting(false)
              setPendingApproval(null)
              onScreenshotRefresh?.()
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
  }, [sessionId, onNewActionMarker, onScreenshotRefresh])

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
    }
    api.abortSession(curId).catch((err) => {
      console.error(`Failed to abort session '${curId}' via REST:`, err)
    })
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
    sendInstruction,
    abortExecution,
    submitApproval,
    setPermissionMode,
    clearEvents,
  }
}
