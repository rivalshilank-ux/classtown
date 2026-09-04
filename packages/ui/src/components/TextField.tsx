import { useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
}

/**
 * Labeled input with an inline error slot. Shared by every auth form so
 * label association, invalid-state styling, and error announcement stay
 * consistent instead of being reimplemented per form.
 */
export function TextField({ label, error, className, ...rest }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[
          "rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
          "focus:ring-2 focus:ring-brand-500",
          error ? "border-red-500" : "border-neutral-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
