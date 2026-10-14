import { connection, type NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api/response";
import { readJsonBody } from "@/lib/api/request";
import { requireAdmin } from "@/lib/auth/admin";
import { ConflictError, create, listQuestions } from "@/lib/questions/repository";
import { parseListParams } from "@/lib/validation/question";
import { parseQuestionInput } from "@/lib/validation/question.server";

export async function GET(request: NextRequest) {
  await connection();
  try {
    return ok(await listQuestions(parseListParams(request.nextUrl.searchParams)));
  } catch (error) {
    return handleError(error, "GET /api/questions");
  }
}

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const parsed = parseQuestionInput(await readJsonBody(request));
    if (!parsed.ok) return fail("validation_error", "Invalid question", 400, parsed.issues);
    return ok(await create(parsed.value), 201);
  } catch (error) {
    if (error instanceof ConflictError) return fail("conflict", error.message, 409);
    return handleError(error, "POST /api/questions");
  }
}
