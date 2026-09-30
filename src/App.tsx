import { useCallback, useEffect, useState } from 'react'
import { api } from './api/client'
import type { ActionMarker, PermissionMode, SessionDetail, SessionSummary } from './api/types'
import { ApprovalGate } from './components/ApprovalGate'
import { ChatStream } from './components/ChatStream'
import { EndpointModal } from './components/EndpointModal'
import { ExportModal } from './components/ExportModal'
import { Header } from './components/Header'
import { NewSessionModal } from './components/NewSessionModal'
import { PromptInput } from './components/PromptInput'
import { ViewportMonitor } from './components/ViewportMonitor'
import { useSessionSocket } from './hooks/useSessionSocket'

export function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null)
  const [backendVersion, setBackendVersion] = useState<string | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean>(false)
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('auto')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [actionMarkers, setActionMarkers] = useState<ActionMarker[]>([])
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false)

  // Trigger snapshot refresh
  const triggerScreenshotRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Handle new action marker with auto-removal after 4 seconds
  const handleNewActionMarker = useCallback((marker: ActionMarker) => {
    setActionMarkers((prev) => [...prev, marker])
    window.setTimeout(() => {
      setActionMarkers((prev) => prev.filter((m) => m.id !== marker.id))
    }, 4000)
  }, [])

  // Hook for WebSocket connection
  const {
    status: connectionStatus,
    events,
    pendingApproval,
    isExecuting,
    sendInstruction,
    abortExecution,
    submitApproval,
    setPermissionMode: updateSocketPermission,
    clearEvents,
  } = useSessionSocket(activeSessionId, handleNewActionMarker, triggerScreenshotRefresh)

  // Load backend status and sessions
  const refreshSessions = useCallback(async () => {
    try {
      const health = await api.checkHealth()
      setBackendVersion(health.version)
      setBackendOnline(true)

      const sessionList = await api.listSessions()
      setSessions(sessionList)

      if (sessionList.length > 0 && !activeSessionId) {
        setActiveSessionId(sessionList[0].session_id)
      }
    } catch (e) {
      console.warn('Backend not available yet:', e)
      setBackendOnline(false)
      setBackendVersion(null)
    }
  }, [activeSessionId])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  // Load active session detail when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSession(null)
      return
    }

    api
      .getSession(activeSessionId)
      .then((detail) => {
        setActiveSession(detail)
        setPermissionMode(detail.permission_mode)
      })
      .catch((err) => {
        console.error('Failed to load session details:', err)
      })
  }, [activeSessionId])

  // Handle session switching
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id)
  }

  // Handle session created from modal
  const handleSessionCreated = async (newId: string) => {
    await refreshSessions()
    setActiveSessionId(newId)
  }

  // Handle permission toggle
  const handleTogglePermission = async () => {
    if (!activeSessionId) return
    const newMode: PermissionMode = permissionMode === 'auto' ? 'manual' : 'auto'
    setPermissionMode(newMode)
    updateSocketPermission(newMode)
    try {
      await api.updatePermission(activeSessionId, newMode)
    } catch (e) {
      console.error('Failed to update permission mode:', e)
    }
  }

  // Handle reset session history
  const handleResetSession = async () => {
    if (!activeSessionId) return
    if (confirm('Clear current session conversation history? (Viewport target remains bound)')) {
      try {
        await api.resetSession(activeSessionId)
        clearEvents()
        triggerScreenshotRefresh()
      } catch (e) {
        console.error('Failed to reset session:', e)
      }
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Header Bar */}
      <Header
        sessions={sessions}
        activeSession={activeSession}
        activeSessionId={activeSessionId}
        backendOnline={backendOnline}
        connectionStatus={connectionStatus}
        backendVersion={backendVersion}
        permissionMode={permissionMode}
        onSelectSession={handleSelectSession}
        onOpenNewSessionModal={() => setIsNewSessionModalOpen(true)}
        onTogglePermission={handleTogglePermission}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onResetSession={handleResetSession}
        onOpenSettingsModal={() => setIsEndpointModalOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left: Viewport Monitor (7 columns) */}
        <section className="col-span-12 lg:col-span-7 h-full overflow-hidden">
          <ViewportMonitor
            session={activeSession}
            markers={actionMarkers}
            refreshTrigger={refreshTrigger}
            onManualRefresh={triggerScreenshotRefresh}
            onOpenNewSessionModal={() => setIsNewSessionModalOpen(true)}
          />
        </section>

        {/* Right: Interaction Stream & Prompt Input (5 columns) */}
        <section className="col-span-12 lg:col-span-5 h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="h-11 px-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between select-none">
            <span className="text-xs font-semibold text-slate-200">Dialogue Stream</span>
            {activeSession && (
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                Mode: {activeSession.mode}
              </span>
            )}
          </div>

          {/* Chat Event List */}
          <ChatStream events={events} isExecuting={isExecuting} />

          {/* Prompt Input Dock */}
          <PromptInput
            disabled={!activeSessionId}
            isExecuting={isExecuting}
            onSubmit={(inst, steps) => sendInstruction(inst, steps)}
            onAbort={abortExecution}
          />
        </section>
      </main>

      {/* 3. Floating Approval Gate */}
      <ApprovalGate
        pending={pendingApproval}
        onApprove={() => submitApproval(true)}
        onReject={(reason) => submitApproval(false, reason)}
      />

      {/* 4. Modals */}
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        onSessionCreated={handleSessionCreated}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        session={activeSession}
        events={events}
        onClose={() => setIsExportModalOpen(false)}
      />

      <EndpointModal
        isOpen={isEndpointModalOpen}
        onClose={() => setIsEndpointModalOpen(false)}
        onEndpointChanged={refreshSessions}
      />
    </div>
  )
}

export default App
