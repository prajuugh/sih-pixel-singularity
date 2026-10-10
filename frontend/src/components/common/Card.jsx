export default function Card({ title, icon: Icon, action, children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-[#e3e5e4] bg-white p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-[#cf432c]" size={20} strokeWidth={2} />}
            {title && <h3 className="font-bold text-gray-900">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
