import type { ReactNode } from "react";

export interface AlertProps {
  variant: "error" | "success";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<AlertProps["variant"], string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
};

/** Top-level form status banner, shared so success/error styling doesn't drift per form. */
export function Alert({ variant, children }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </div>
  );
}
