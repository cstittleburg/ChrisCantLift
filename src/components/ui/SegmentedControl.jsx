// View switcher: options are [value, label] pairs.
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex bg-bench border border-seam rounded-input p-1 gap-1" role="tablist">
      {options.map(([v, label]) => {
        const selected = value === v;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(v)}
            className={`flex-1 min-h-[44px] rounded-[10px] text-sm ${
              selected ? 'bg-chalk text-floor font-bold' : 'text-dust font-semibold'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
