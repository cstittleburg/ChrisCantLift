// 44×44 icon-only button. `aria-label` is required so screen readers can name it.
export default function IconButton({ 'aria-label': ariaLabel, className = '', children, ...props }) {
  return (
    <button
      aria-label={ariaLabel}
      className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-input bg-bench border border-seam text-dust active:bg-plate ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
