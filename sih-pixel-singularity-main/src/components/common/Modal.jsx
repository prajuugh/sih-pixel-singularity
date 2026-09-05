import { X } from "lucide-react";

export default function Modal({ title, icon: Icon, onClose, children, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} p-6 relative`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {title && (
          <div className="flex items-center gap-2 mb-6">
            {Icon && <Icon className="text-green-800" size={22} />}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
