import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ title, icon: Icon, onClose, children, maxWidth = "max-w-md" }) {
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        className={`relative w-full rounded-xl border border-[#dfe3e1] bg-white p-6 shadow-[0_24px_70px_rgb(0_0_0/0.16)] ${maxWidth}`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315b75]"
        >
          <X size={20} strokeWidth={2} />
        </button>

        {title && (
          <div className="flex items-center gap-2 mb-6">
            {Icon && <Icon className="text-[#cf432c]" size={22} strokeWidth={2} />}
            <h2 id={titleId} className="pr-10 text-xl font-bold text-gray-900">{title}</h2>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
