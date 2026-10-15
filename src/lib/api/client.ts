import type {
  ApiErrorBody,
  ApiErrorCode,
  ApiFieldIssue,
  ListParams,
  Question,
  QuestionInput,
  QuestionListResult,
} from "@/lib/types/question";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: ApiFieldIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

type Envelope = { data?: unknown; error?: ApiErrorBody };

async function readEnvelope(response: Response): Promise<Envelope | null> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null ? (body as Envelope) : null;
  } catch {
    return null;
  }
}

async function request<T>(url: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiError(0, "internal_error", "Network error: could not reach the server");
  }
  const envelope = await readEnvelope(response);
  if (!response.ok || envelope?.error) {
    const error = envelope?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "internal_error",
      error?.message ?? `Request failed with status ${response.status}`,
      error?.details,
    );
  }
  if (!envelope || !("data" in envelope)) {
    throw new ApiError(response.status, "internal_error", "Unexpected response from the server");
  }
  return envelope.data as T;
}

function toQueryString(params: ListParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.difficulty) query.set("difficulty", params.difficulty);
  if (params.kind) query.set("kind", params.kind);
  if (params.tags && params.tags.length > 0) query.set("tags", params.tags.join(","));
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function listQuestions(params: ListParams, init?: { signal?: AbortSignal }): Promise<QuestionListResult> {
  return request(`/api/questions${toQueryString(params)}`, { signal: init?.signal });
}

export function getQuestion(slug: string, init?: { signal?: AbortSignal }): Promise<Question> {
  return request(`/api/questions/${encodeURIComponent(slug)}`, { signal: init?.signal });
}

export function createQuestion(input: QuestionInput): Promise<Question> {
  return request("/api/questions", { method: "POST", body: input });
}

export function updateQuestion(slug: string, input: QuestionInput): Promise<Question> {
  return request(`/api/questions/${encodeURIComponent(slug)}`, { method: "PUT", body: input });
}

export async function deleteQuestion(slug: string): Promise<void> {
  await request(`/api/questions/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

export async function adminLogin(password: string): Promise<void> {
  await request("/api/admin/login", { method: "POST", body: { password } });
}

export async function adminLogout(): Promise<void> {
  await request("/api/admin/logout", { method: "POST" });
}
