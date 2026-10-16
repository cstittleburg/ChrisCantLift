import { Minus, Plus } from 'lucide-react';

// Label on top, then [−] value [+] in one 56px box. The value stays a real, typeable input.
export default function Stepper({ label, value, onChange, step = 1, inputMode = 'numeric', placeholder = '' }) {
  const bump = (dir) => {
    const current = parseFloat(value);
    const base = Number.isNaN(current) ? (parseFloat(placeholder) || 0) : current;
    const next = Math.max(0, base + dir * step);
    onChange(String(next));
  };
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-dust mb-1.5">{label}</p>
      <div className="flex items-center h-14 bg-floor border border-seam rounded-input">
        <button type="button" onClick={() => bump(-1)} aria-label={`Decrease ${label}`}
          className="w-11 h-full flex items-center justify-center text-dust active:text-chalk flex-shrink-0">
          <Minus size={18} />
        </button>
        <input
          inputMode={inputMode}
          type="number"
          aria-label={label}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="flex-1 min-w-0 w-full h-full bg-transparent text-center font-display font-bold text-[30px] leading-none text-chalk tabular-nums placeholder-ash focus:outline-none"
        />
        <button type="button" onClick={() => bump(1)} aria-label={`Increase ${label}`}
          className="w-11 h-full flex items-center justify-center text-dust active:text-chalk flex-shrink-0">
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
