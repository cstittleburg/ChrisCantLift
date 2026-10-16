// One shared map for how a workout's focus looks, used on every screen.
export const FOCUS = {
  heavy: { label: 'Heavy',     text: 'text-orange', bg: 'bg-orange', dot: 'bg-orange' },
  reps:  { label: 'More reps', text: 'text-brass',  bg: 'bg-brass',  dot: 'bg-brass' },
  short: { label: 'Short',     text: 'text-teal',   bg: 'bg-teal',   dot: 'bg-teal' },
};

export const focusOf = (workout) => FOCUS[workout?.focus] || FOCUS.heavy;

// Filled focus badge: focus color with dark text
export function FocusBadge({ workout, className = '' }) {
  const f = focusOf(workout);
  return (
    <span className={`${f.bg} text-floor font-display font-bold uppercase tracking-wide text-sm px-2 py-0.5 rounded-lg ${className}`}>
      {f.label}
    </span>
  );
}
