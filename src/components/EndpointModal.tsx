import React, { useState } from 'react'
import { CheckCircle2, Globe, RefreshCw, Server, X, AlertCircle } from 'lucide-react'
import { api } from '../api/client'

interface EndpointModalProps {
  isOpen: boolean
  onClose: () => void
  onEndpointChanged: () => void
}

export const EndpointModal: React.FC<EndpointModalProps> = ({
  isOpen,
  onClose,
  onEndpointChanged,
}) => {
  const currentBase = api.getBaseUrl()
  const [url, setUrl] = useState(currentBase || '')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [testMessage, setTestMessage] = useState<string>('')

  if (!isOpen) return null

  const handleTestConnection = async (targetUrl: string) => {
    setTestStatus('testing')
    setTestMessage('')
    try {
      const formatted = targetUrl.replace(/\/$/, '')
      const testEndpoint = formatted ? `${formatted}/api/v1/health` : '/api/v1/health'
      const res = await fetch(testEndpoint, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      setTestStatus('success')
      setTestMessage(`Connected to AEFlow v${data.version || '0.1.x'} successfully!`)
    } catch (err: unknown) {
      setTestStatus('failed')
      const msg = err instanceof Error ? err.message : String(err)
      setTestMessage(`Connection failed: ${msg}. Make sure 'aef serve' is running.`)
    }
  }

  const handleSave = () => {
    const trimmed = url.trim()
    api.setBaseUrl(trimmed)
    onEndpointChanged()
    onClose()
  }

  const handleSelectPreset = (presetUrl: string) => {
    setUrl(presetUrl)
    handleTestConnection(presetUrl)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Backend Endpoint Settings</h2>
              <p className="text-xs text-slate-400">Configure connection to AEFlow daemon</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Daemon API URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setTestStatus('idle')
                }}
                placeholder="http://127.0.0.1:8000"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition"
              />
              <button
                type="button"
                onClick={() => handleTestConnection(url)}
                disabled={testStatus === 'testing'}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>Test</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Default is <code className="text-indigo-400 font-mono">http://127.0.0.1:8000</code>. If port 8000 is occupied, set to the port used by <code className="text-indigo-400 font-mono">aef serve --port &lt;port&gt;</code>.
            </p>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Quick Presets</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('http://127.0.0.1:8000')}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  url === 'http://127.0.0.1:8000'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                Port 8000
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('http://127.0.0.1:8001')}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  url === 'http://127.0.0.1:8001'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                Port 8001
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('http://127.0.0.1:8002')}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  url === 'http://127.0.0.1:8002'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                Port 8002
              </button>
            </div>
          </div>

          {/* Test Status feedback */}
          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testStatus === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : testStatus === 'failed'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              {testStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : testStatus === 'failed' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-slate-400 animate-spin shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                {testStatus === 'testing' ? 'Testing connectivity to endpoint...' : testMessage}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSelectPreset('')}
            className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Reset to Auto Proxy</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition cursor-pointer"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
