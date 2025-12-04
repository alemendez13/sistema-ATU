import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  ...props
}: ButtonProps) {
  
  // Estilos base (comunes para todos)
  const baseStyles = "px-4 py-2 rounded-lg font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  // Variantes de color (Elige tu sabor)
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    success: "bg-green-100 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white",
    outline: "border border-slate-300 text-slate-600 hover:bg-slate-50"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span>⏳ Procesando...</span>
      ) : (
        children
      )}
    </button>
  );
}