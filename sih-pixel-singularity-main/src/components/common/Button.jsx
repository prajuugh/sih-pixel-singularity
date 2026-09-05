const variants = {
  primary:
    "bg-green-800 hover:bg-green-900 text-white",
  outline:
    "border border-green-700 text-green-800 hover:bg-green-50 bg-white",
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
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variants[variant] || variants.primary
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}
