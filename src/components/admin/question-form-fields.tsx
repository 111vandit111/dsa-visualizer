"use client";

import { CodeEditor } from "@/components/shared/code-editor";
import { MarkdownView } from "@/components/shared/markdown-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VISUAL_HINT_TYPES } from "@/lib/tracer/types";
import { DIFFICULTIES, KIND_LABELS, QUESTION_KINDS, type Difficulty, type QuestionKind } from "@/lib/types/question";
import { FormField, describedBy, fieldIds } from "./form-field";
import {
  DESIGN_EXAMPLE,
  METHOD_EXAMPLE,
  type FormErrors,
  type QuestionFormValues,
} from "./question-form-model";
import { TagsInput } from "./tags-input";

export type FieldChangeHandler = <K extends keyof QuestionFormValues>(key: K, value: QuestionFormValues[K]) => void;

interface FieldsProps {
  values: QuestionFormValues;
  errors: FormErrors;
  onChange: FieldChangeHandler;
}

const SOLUTION_HEIGHT = "380px";
const TEST_CASES_HEIGHT = "240px";
const HINTS_HEIGHT = "150px";

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

function isQuestionKind(value: string): value is QuestionKind {
  return (QUESTION_KINDS as readonly string[]).includes(value);
}

export function BasicsFields({ values, errors, onChange }: FieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField field="title" label="Title" error={errors.title}>
        <Input
          id={fieldIds("title").inputId}
          data-testid="form-title"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title", errors.title)}
        />
      </FormField>
      <FormField
        field="slug"
        label="Slug"
        error={errors.slug}
        hint="Used in the URL. Filled in from the title until you edit it."
      >
        <Input
          id={fieldIds("slug").inputId}
          data-testid="form-slug"
          className="font-mono"
          value={values.slug}
          onChange={(event) => onChange("slug", event.target.value)}
          aria-invalid={Boolean(errors.slug)}
          aria-describedby={describedBy("slug", errors.slug, true)}
        />
      </FormField>
      <FormField field="difficulty" label="Difficulty" error={errors.difficulty}>
        <Select
          value={values.difficulty}
          onValueChange={(value) => {
            if (isDifficulty(value)) onChange("difficulty", value);
          }}
        >
          <SelectTrigger
            id={fieldIds("difficulty").inputId}
            data-testid="form-difficulty"
            className="w-full"
            aria-describedby={describedBy("difficulty", errors.difficulty)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((difficulty) => (
              <SelectItem key={difficulty} value={difficulty}>
                {difficulty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField field="kind" label="Kind" error={errors.kind}>
        <Select
          value={values.kind}
          onValueChange={(value) => {
            if (isQuestionKind(value)) onChange("kind", value);
          }}
        >
          <SelectTrigger
            id={fieldIds("kind").inputId}
            data-testid="form-kind"
            className="w-full"
            aria-describedby={describedBy("kind", errors.kind)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {KIND_LABELS[kind].singular}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField field="tags" label="Tags" error={errors.tags} hint="Lowercase letters, digits and dashes.">
        <TagsInput
          id={fieldIds("tags").inputId}
          value={values.tags}
          onChange={(tags) => onChange("tags", tags)}
          isInvalid={Boolean(errors.tags)}
          ariaDescribedBy={describedBy("tags", errors.tags, true)}
        />
      </FormField>
    </div>
  );
}

export function DescriptionField({ values, errors, onChange }: FieldsProps) {
  return (
    <FormField field="description" label="Description (Markdown)" error={errors.description}>
      <Tabs defaultValue="write">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <Textarea
            id={fieldIds("description").inputId}
            data-testid="form-description"
            rows={10}
            className="font-mono text-sm"
            value={values.description}
            onChange={(event) => onChange("description", event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy("description", errors.description)}
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-40 rounded-lg border border-border bg-card/60 p-4">
            {values.description.trim() ? (
              <MarkdownView markdown={values.description} />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </FormField>
  );
}

function HintsHelp() {
  return (
    <>
      A JSON object mapping a variable path to how it is drawn. Types:{" "}
      {VISUAL_HINT_TYPES.map((type, index) => (
        <span key={type}>
          {index > 0 ? ", " : null}
          <code className="font-mono text-foreground">{type}</code>
        </span>
      ))}
      . Paths are dotted: <code className="font-mono text-foreground">this.tweetMap</code> for a field on{" "}
      <code className="font-mono text-foreground">this</code>, or{" "}
      <code className="font-mono text-foreground">minHeap</code> /{" "}
      <code className="font-mono text-foreground">a.b.c</code> for a local variable. Example:{" "}
      <code className="font-mono text-foreground">{`{ "this.tweetMap": "map", "minHeap": "heap" }`}</code>
    </>
  );
}

export function CodeFields({ values, errors, onChange }: FieldsProps) {
  const exampleButtons = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onChange("testCases", DESIGN_EXAMPLE)}>
        Insert design example
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange("testCases", METHOD_EXAMPLE)}>
        Insert method example
      </Button>
    </div>
  );

  return (
    <>
      <FormField
        field="solutionCode"
        label="Solution code (JavaScript)"
        error={errors.solutionCode}
        hint="A class (design problems) or a function. Line numbers in the visualizer match this editor."
      >
        <div data-testid="form-solutionCode">
          <CodeEditor
            language="javascript"
            ariaLabel="Solution code"
            height={SOLUTION_HEIGHT}
            value={values.solutionCode}
            onChange={(value) => onChange("solutionCode", value)}
          />
        </div>
      </FormField>
      <FormField
        field="testCases"
        label="Test cases (JSON)"
        error={errors.testCases}
        action={exampleButtons}
        hint={
          <>
            Method case: <code className="font-mono text-foreground">{`{ "method", "args", "expected" }`}</code>. Design
            case: <code className="font-mono text-foreground">{`{ "ops", "args", "expected" }`}</code> with equal
            lengths; the first op is the constructor.
          </>
        }
      >
        <div data-testid="form-testCases">
          <CodeEditor
            language="json"
            ariaLabel="Test cases JSON"
            height={TEST_CASES_HEIGHT}
            value={values.testCases}
            onChange={(value) => onChange("testCases", value)}
          />
        </div>
      </FormField>
      <FormField
        field="visualHints"
        label="Visual hints (JSON)"
        error={errors.visualHints}
        hint={<HintsHelp />}
      >
        <div data-testid="form-visualHints">
          <CodeEditor
            language="json"
            ariaLabel="Visual hints JSON"
            height={HINTS_HEIGHT}
            value={values.visualHints}
            onChange={(value) => onChange("visualHints", value)}
          />
        </div>
      </FormField>
    </>
  );
}
