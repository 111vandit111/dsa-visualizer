import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { fail, handleError, ok } from "@/lib/api/response";
import { readJsonBody } from "@/lib/api/request";
import { requireAdmin } from "@/lib/auth/admin";
import { ConflictError, getBySlug, remove, update } from "@/lib/questions/repository";
import { QUESTIONS_CACHE_TAG } from "@/lib/seo/data";
import { parseQuestionInput } from "@/lib/validation/question.server";

const notFound = () => fail("not_found", "Question not found", 404);

export async function GET(_request: Request, ctx: RouteContext<"/api/questions/[slug]">) {
  await connection();
  try {
    const { slug } = await ctx.params;
    const question = await getBySlug(slug);
    return question ? ok(question) : notFound();
  } catch (error) {
    return handleError(error, "GET /api/questions/[slug]");
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/questions/[slug]">) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { slug } = await ctx.params;
    const parsed = parseQuestionInput(await readJsonBody(request));
    if (!parsed.ok) return fail("validation_error", "Invalid question", 400, parsed.issues);
    const question = await update(slug, parsed.value);
    if (!question) return notFound();
    revalidateTag(QUESTIONS_CACHE_TAG, { expire: 0 });
    return ok(question);
  } catch (error) {
    if (error instanceof ConflictError) return fail("conflict", error.message, 409);
    return handleError(error, "PUT /api/questions/[slug]");
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/questions/[slug]">) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { slug } = await ctx.params;
    if (!(await remove(slug))) return notFound();
    revalidateTag(QUESTIONS_CACHE_TAG, { expire: 0 });
    return ok({ slug });
  } catch (error) {
    return handleError(error, "DELETE /api/questions/[slug]");
  }
}
