import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
  formatDisplay?: (value: string) => string;
}

export function InlineEdit({ value, onSave, type = 'text', className = '', formatDisplay }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  };

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className={`cursor-pointer rounded px-1 py-0.5 hover:bg-lureh-50 hover:ring-1 hover:ring-lureh-200 dark:hover:bg-lureh-950 dark:hover:ring-lureh-700 ${className}`}
        title="Clic para editar"
      >
        {formatDisplay ? formatDisplay(value) : value}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={`rounded border border-lureh-300 bg-white px-1.5 py-0.5 text-sm outline-none ring-1 ring-lureh-400 dark:border-lureh-600 dark:bg-slate-800 dark:ring-lureh-500 ${className}`}
    />
  );
}
