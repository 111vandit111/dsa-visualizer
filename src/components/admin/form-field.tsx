import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormField as FormFieldName } from "./question-form-model";

interface FormFieldProps {
  field: FormFieldName;
  label: string;
  error?: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function fieldIds(field: FormFieldName) {
  return { inputId: `field-${field}`, errorId: `field-${field}-error`, hintId: `field-${field}-hint` };
}

/** Label + control + hint + inline error. Controls link to the error with aria-describedby={errorId}. */
export function FormField({ field, label, error, hint, action, className, children }: FormFieldProps) {
  const { inputId, errorId, hintId } = fieldIds(field);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        {action}
      </div>
      {hint ? (
        <div id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </div>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} data-testid={`form-error-${field}`} role="alert" className="text-sm break-words text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(field: FormFieldName, error: string | undefined, hasHint = false): string | undefined {
  const { errorId, hintId } = fieldIds(field);
  const ids = [hasHint ? hintId : null, error ? errorId : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
