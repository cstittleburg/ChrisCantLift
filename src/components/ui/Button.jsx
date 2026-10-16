// primary: the one main action per screen (orange, dark text). secondary: everything else.
export default function Button({ variant = 'primary', className = '', children, ...props }) {
  const styles = variant === 'primary'
    ? 'bg-orange text-floor font-display font-bold uppercase tracking-wide text-xl min-h-[56px] rounded-tile active:brightness-90'
    : 'bg-floor border border-seam text-chalk font-semibold min-h-[44px] rounded-input active:bg-plate';
  return (
    <button className={`flex items-center justify-center gap-2 px-4 disabled:opacity-40 ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
