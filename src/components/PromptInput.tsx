import React, { useState } from 'react'
import { ArrowUp, Sparkles, Square } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

interface PromptInputProps {
  disabled: boolean
  isExecuting: boolean
  onSubmit: (instruction: string, maxSteps: number) => void
  onAbort?: () => void
}

export const PromptInput: React.FC<PromptInputProps> = ({
  disabled,
  isExecuting,
  onSubmit,
  onAbort,
}) => {
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const [maxSteps, setMaxSteps] = useState(50)

  const quickPrompts = [
    t('prompt.quick1'),
    t('prompt.quick2'),
    t('prompt.quick3'),
  ]

  const handleSend = () => {
    if (!text.trim() || disabled || isExecuting) return
    onSubmit(text.trim(), maxSteps)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-slate-800 bg-slate-900/90 p-4 select-none">
      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-2 scrollbar-none">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            disabled={disabled || isExecuting}
            onClick={() => setText(prompt)}
            className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950/70 hover:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-800 whitespace-nowrap transition cursor-pointer disabled:opacity-40"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box & Action Controls */}
      <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 transition shadow-inner">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isExecuting}
          rows={2}
          placeholder={
            disabled
              ? t('prompt.placeholderDisabled')
              : isExecuting
              ? t('prompt.placeholderExecuting')
              : t('prompt.placeholderIdle')
          }
          className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 px-4 pt-3 pb-1 resize-none focus:outline-none disabled:opacity-50 select-text"
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-900">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{t('prompt.maxSteps')}</span>
            <select
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              disabled={disabled || isExecuting}
              className="bg-slate-900 text-slate-300 rounded px-1.5 py-0.5 border border-slate-800 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value={20}>{t('prompt.steps20')}</option>
              <option value={50}>{t('prompt.steps50')}</option>
              <option value={100}>{t('prompt.steps100')}</option>
            </select>
          </div>

          {isExecuting ? (
            <button
              type="button"
              onClick={onAbort}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-600/30 transition active:scale-95 cursor-pointer animate-pulse"
              title={t('prompt.stop')}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t('prompt.stop')}</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
