export default function SectionLabel({ as: Tag = 'p', className = '', children }) {
  return (
    <Tag className={`text-xs font-bold uppercase tracking-[0.14em] text-dust ${className}`}>{children}</Tag>
  );
}
