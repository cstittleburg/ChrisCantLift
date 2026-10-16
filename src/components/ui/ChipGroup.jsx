// Equal-width row of 44px choice buttons. options: [{ value, label }]
export default function ChipGroup({ label, options, value, onChange }) {
  return (
    <div>
      {label && <p className="text-xs font-bold uppercase tracking-[0.14em] text-dust mb-1.5">{label}</p>}
      <div className="flex gap-1.5" role="group" aria-label={label}>
        {options.map(o => {
          const selected = value === o.value;
          return (
            <button
              type="button"
              key={o.value}
              aria-pressed={selected}
              onClick={() => onChange(o.value)}
              className={`flex-1 min-h-[44px] rounded-input font-display font-bold text-lg tabular-nums ${
                selected ? 'bg-chalk text-floor' : 'bg-floor border border-seam text-dust'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
