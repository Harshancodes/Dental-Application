import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  options: SelectOption[]
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

/**
 * Searchable combobox — type to filter options, click to select.
 * Replaces plain <select> elements throughout the app.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  required,
  className = '',
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Label of the currently selected option
  const selectedLabel = options.find(o => String(o.value) === String(value))?.label ?? ''

  // Filter options based on what the user typed
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt: SelectOption) => {
    onChange(String(opt.value))
    setQuery('')
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
    // Clear selection when user starts typing a new search
    if (value) onChange('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden native input for form validation */}
      <input type="hidden" value={value} required={required} />

      {/* Display input */}
      <div
        className="flex items-center w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selectedLabel}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={!value ? placeholder : ''}
          className="flex-1 outline-none bg-transparent text-slate-800 placeholder-slate-400 min-w-0"
        />
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600 p-0.5 rounded">
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">No results found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                    String(opt.value) === String(value)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
