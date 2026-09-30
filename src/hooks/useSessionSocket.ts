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
  const reconnectTimeoutRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  // Clear events when session changes
  useEffect(() => {
    setEvents([])
    setPendingApproval(null)
    setIsExecuting(false)
  }, [sessionId])

  useEffect(() => {
    isMountedRef.current = true
    if (!sessionId) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      setStatus('disconnected')
      return
    }

    const connect = () => {
      if (!isMountedRef.current || !sessionId) return

      setStatus('connecting')
      const wsUrl = api.getWebSocketUrl(sessionId)
      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        if (!isMountedRef.current) return
        setStatus('connected')
      }

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return
        try {
          const ev: SessionEvent = JSON.parse(event.data)
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
            case 'aborted':
            case 'error': {
              setIsExecuting(false)
              setPendingApproval(null)
              onScreenshotRefresh?.()
              break
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onclose = (event: CloseEvent) => {
        if (!isMountedRef.current) return
        setStatus('disconnected')
        // Stop reconnect loop if session was rejected by server policy / does not exist
        if (event.code === 1008 || event.code === 4404) {
          console.warn(
            `[AEFlow WS] Session '${sessionId}' was closed by server (code ${event.code}): ${event.reason || 'session not found'}. Stopping reconnect loop.`
          )
          return
        }
        // Reconnect after 3 seconds if still mounted
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current && sessionId) {
            connect()
          }
        }, 3000)
      }

      ws.onerror = (err) => {
        console.warn('WebSocket error, closing connection:', err)
        ws.close()
      }
    }

    connect()

    return () => {
      isMountedRef.current = false
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [sessionId, onNewActionMarker, onScreenshotRefresh])

  const sendInstruction = useCallback(
    (instruction: string, maxSteps = 100) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: 'message',
            instruction,
            max_steps: maxSteps,
          })
        )
        setIsExecuting(true)
      } else if (sessionId) {
        // Fallback to REST API
        setIsExecuting(true)
        api
          .sendMessage(sessionId, { instruction, max_steps: maxSteps, async_execution: true })
          .catch((err) => {
            console.error('Failed to send instruction via REST fallback:', err)
            setIsExecuting(false)
          })
      }
    },
    [sessionId]
  )

  const submitApproval = useCallback(
    (approved: boolean, reason?: string) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: 'approval',
            approved,
            reason,
          })
        )
      } else if (sessionId) {
        api.submitApproval(sessionId, { approved, reason }).catch(console.error)
      }
      setPendingApproval(null)
    },
    [sessionId]
  )

  const setPermissionMode = useCallback(
    (mode: PermissionMode) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: 'permission',
            mode,
          })
        )
      } else if (sessionId) {
        api.updatePermission(sessionId, mode).catch(console.error)
      }
    },
    [sessionId]
  )

  const abortExecution = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'abort',
        })
      )
    }
    if (sessionId) {
      api.abortSession(sessionId).catch((err) => {
        console.error('Failed to abort session via REST:', err)
      })
    }
    setIsExecuting(false)
    setPendingApproval(null)
  }, [sessionId])

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
