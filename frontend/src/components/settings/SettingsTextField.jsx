export default function SettingsTextField({
  id,
  label,
  defaultValue = '',
  type = 'text',
  className = '',
  labelClassName = '',
  ...props
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`mb-1.5 block text-sm text-gray-700 ${labelClassName}`.trim()}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors duration-200 focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
        {...props}
      />
    </div>
  );
}
