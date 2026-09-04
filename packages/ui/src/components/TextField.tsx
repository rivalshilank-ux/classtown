import { useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
}

export function TextField({ label, error, className, ...rest }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-900">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[
          "border-2 bg-cream-400 px-3 py-2 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-600/60",
          "focus:border-accent-600 focus:ring-2 focus:ring-accent-600/40",
          error ? "border-bad" : "border-wood-600",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
