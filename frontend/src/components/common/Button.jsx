const variants = {
  primary:
    "bg-[#171918] hover:bg-black text-white",
  outline:
    "border border-gray-300 text-[#171918] hover:bg-gray-50 bg-white",
  secondary:
    "border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white",
  danger:
    "bg-red-600 hover:bg-red-700 text-white",
  ghost:
    "text-gray-500 hover:text-gray-700",
};

export default function Button({
  children,
  variant = "primary",
  icon: Icon,
  className = "",
  fullWidth = false,
  static: isStatic = false,
  ...props
}) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        variants[variant] || variants.primary
      } ${fullWidth ? "w-full" : ""} ${className}`}
      data-static={isStatic || undefined}
      {...props}
    >
      {Icon && <Icon size={18} strokeWidth={2} />}
      {children}
    </button>
  );
}
