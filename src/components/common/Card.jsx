export default function Card({ title, icon: Icon, action, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-green-800" size={20} />}
            {title && <h3 className="font-bold text-gray-900">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
