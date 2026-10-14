"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, createQuestion, updateQuestion } from "@/lib/api/client";
import type { QuestionInput } from "@/lib/types/question";
import { PreviewRun } from "./preview-run";
import { BasicsFields, CodeFields, DescriptionField, type FieldChangeHandler } from "./question-form-fields";
import {
  EMPTY_VALUES,
  mapIssuesToErrors,
  parseFormValues,
  slugify,
  type FormErrors,
  type QuestionFormValues,
} from "./question-form-model";
import { useUnauthorizedRedirect } from "./use-unauthorized-redirect";

const HTTP_CONFLICT = 409;
const SLUG_TAKEN_MESSAGE = "This slug is already used by another question.";

interface QuestionFormProps {
  /** Present when editing: the slug the question currently has (the slug field may change it). */
  originalSlug?: string;
  initialValues?: QuestionFormValues;
}

interface FormBodyProps extends QuestionFormProps {
  onSaved: () => void;
}

function errorsFromApi(error: unknown): FormErrors {
  if (error instanceof ApiError) {
    if (error.status === HTTP_CONFLICT) return { slug: SLUG_TAKEN_MESSAGE };
    if (error.details.length > 0) return mapIssuesToErrors(error.details);
    return { form: error.message };
  }
  return { form: error instanceof Error ? error.message : "Could not save the question." };
}

function QuestionFormBody({ originalSlug, initialValues = EMPTY_VALUES, onSaved }: FormBodyProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const redirectIfUnauthorized = useUnauthorizedRedirect();
  const [values, setValues] = useState(initialValues);
  const [isSlugEdited, setIsSlugEdited] = useState(originalSlug !== undefined);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange: FieldChangeHandler = (key, value) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "title" && !isSlugEdited) next.slug = slugify(String(value));
      return next;
    });
    if (key === "slug") setIsSlugEdited(String(value) !== "");
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  const showErrors = (next: FormErrors) => {
    setErrors(next);
    requestAnimationFrame(() => {
      formRef.current?.querySelector('[data-testid^="form-error-"]')?.scrollIntoView({ block: "center" });
    });
  };

  const save = async (input: QuestionInput) => {
    setIsSubmitting(true);
    try {
      if (originalSlug === undefined) await createQuestion(input);
      else await updateQuestion(originalSlug, input);
      toast.success(originalSlug === undefined ? "Question created" : "Question saved");
      onSaved();
      router.replace("/admin");
    } catch (error) {
      if (!redirectIfUnauthorized(error)) showErrors(errorsFromApi(error));
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseFormValues(values);
    if (!parsed.ok) {
      showErrors(parsed.errors);
      return;
    }
    setErrors({});
    await save(parsed.input);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.form ? (
        <Alert variant="destructive" data-testid="form-error-form">
          <AlertDescription className="break-words">{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      <BasicsFields values={values} errors={errors} onChange={handleChange} />
      <DescriptionField values={values} errors={errors} onChange={handleChange} />
      <CodeFields values={values} errors={errors} onChange={handleChange} />
      <PreviewRun
        solutionCode={values.solutionCode}
        testCasesText={values.testCases}
        onInvalid={(invalid) => setErrors((current) => ({ ...current, ...invalid }))}
      />
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
        <Button asChild variant="ghost">
          <Link href="/admin">Cancel</Link>
        </Button>
        <Button type="submit" data-testid="form-submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
          {originalSlug === undefined ? "Create question" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/** Remounts the form after a save: cached routes keep component state alive, so "New question" would reopen filled in. */
export function QuestionForm(props: QuestionFormProps) {
  const [instance, setInstance] = useState(0);
  return <QuestionFormBody key={instance} {...props} onSaved={() => setInstance((count) => count + 1)} />;
}
