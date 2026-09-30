export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type TargetType = 'display' | 'window'

export interface TargetInfo {
  target_id: string
  target_type: TargetType
  title: string
  native_handle: number
  process_name: string
  is_minimized: boolean
  rect: Rect
}

export type ExecutionMode = 'minimal' | 'guarded'
export type PermissionMode = 'auto' | 'manual'
export type SessionState =
  | 'idle'
  | 'running'
  | 'waiting_approval'
  | 'waiting_input'
  | 'aborted'
  | 'error'
  | 'closed'

export interface PendingApproval {
  action: string
  params: Record<string, unknown>
  code_snippet?: string
  context?: string
  requested_at?: number
}

export interface SessionSummary {
  session_id: string
  target_id: string
  title: string
  mode: ExecutionMode
  permission_mode: PermissionMode
  state: SessionState
  turn_count: number
  total_steps: number
}

export interface SessionDetail {
  session_id: string
  target: {
    target_id: string
    title: string
    rect: Rect
  }
  mode: ExecutionMode
  permission_mode: PermissionMode
  state: SessionState
  turn_count: number
  total_steps: number
  pending_approval: PendingApproval | null
}

export type SessionEventType =
  | 'session_start'
  | 'turn_start'
  | 'observe'
  | 'reasoning'
  | 'action_proposed'
  | 'approval_required'
  | 'approval_resolved'
  | 'action_executed'
  | 'step_finished'
  | 'task_completed'
  | 'aborted'
  | 'error'

export interface SessionEvent {
  session_id: string
  event_type: SessionEventType
  step: number
  payload: Record<string, unknown>
  timestamp: number
}

export interface HealthResponse {
  status: string
  version: string
  active_sessions: number
}

export interface CreateSessionRequest {
  target_id: string
  mode?: ExecutionMode
  permission_mode?: PermissionMode
  session_id?: string
}

export interface SendMessageRequest {
  instruction: string
  max_steps?: number
  async_execution?: boolean
}

export interface SubmitApprovalRequest {
  approved: boolean
  reason?: string
}

export interface ActionMarker {
  id: string
  x: number
  y: number
  action: string
  timestamp: number
}
