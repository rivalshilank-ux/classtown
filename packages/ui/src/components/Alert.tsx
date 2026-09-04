import type { ReactNode } from "react";

export interface AlertProps {
  variant: "info" | "success" | "warning" | "error";
  children: ReactNode;
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0 3a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.18c.75 1.335-.213 2.987-1.744 2.987H3.72c-1.53 0-2.494-1.652-1.744-2.987l6.28-11.18zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 112 10a8 8 0 0116 0zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const VARIANT_CONFIG: Record<
  AlertProps["variant"],
  { classes: string; role: "status" | "alert"; icon: ReactNode }
> = {
  info: {
    classes: "border-sky-200 bg-sky-50 text-sky-800",
    role: "status",
    icon: <InfoIcon />,
  },
  success: {
    classes: "border-green-200 bg-green-50 text-green-700",
    role: "status",
    icon: <SuccessIcon />,
  },
  warning: {
    classes: "border-amber-200 bg-amber-50 text-amber-800",
    role: "alert",
    icon: <WarningIcon />,
  },
  error: {
    classes: "border-red-200 bg-red-50 text-red-700",
    role: "alert",
    icon: <ErrorIcon />,
  },
};

export function Alert({ variant, children }: AlertProps) {
  const { classes, role, icon } = VARIANT_CONFIG[variant];

  return (
    <div role={role} className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${classes}`}>
      {icon}
      <span>{children}</span>
    </div>
  );
}
