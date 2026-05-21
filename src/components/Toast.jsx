import Icon from './Icon';

export default function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-2xl bg-inverse-surface px-6 py-3 text-inverse-on-surface shadow-2xl transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <Icon name="auto_awesome" className="text-primary" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
