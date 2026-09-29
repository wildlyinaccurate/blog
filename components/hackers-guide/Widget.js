// Shared frame for the interactive elements.

export function Widget({ title, children }) {
  return (
    <div className="hg-widget">
      {title && <div className="hg-title">{title}</div>}
      {children}
    </div>
  );
}
