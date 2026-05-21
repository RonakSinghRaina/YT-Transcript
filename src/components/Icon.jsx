export default function Icon({ name, fill = false, className = '' }) {
  return (
    <span className={`material-symbols-outlined ${fill ? 'fill' : ''} ${className}`.trim()}>
      {name}
    </span>
  );
}
