import { X } from "lucide-react";

export default function Modal({ title, icon: Icon, onClose, children, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-[2px]">
      <div
        className={`relative w-full rounded-xl border border-[#dfe3e1] bg-white p-6 shadow-[0_24px_70px_rgb(0_0_0/0.16)] ${maxWidth}`}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-xl text-gray-400 transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-gray-100 hover:text-gray-700 active:scale-[0.96]"
        >
          <X size={20} strokeWidth={2} />
        </button>

        {title && (
          <div className="flex items-center gap-2 mb-6">
            {Icon && <Icon className="text-[#cf432c]" size={22} strokeWidth={2} />}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
