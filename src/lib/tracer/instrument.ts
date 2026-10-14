import { parse, type Options, type Program } from "acorn";
import { TracerSyntaxError } from "./instrument-error";
import { hoistedBindings, unwrapParens } from "./instrument-scope";
import { Instrumenter, startLine, type FunctionInfo } from "./instrument-walk";

/*
 * Auto-tracer instrumentation by TEXT SPLICING: hook calls are inserted into the original source
 * (never re-printed, never adding line breaks), so every line number stays the editor's line number.
 *
 * Hook protocol (`H` = InstrumentResult.hooksName, passed in as a parameter; R = scope reader):
 *   ;H.step(line, R);          before every statement of a program / block / switch case
 *   H.loop(line, R);           first thing in every loop-body iteration (single-statement bodies get `{}`)
 *   H.enter(name, line, R);try{ ... ;H.fall(endLine);}finally{H.exit()}
 *                              around block bodies of plain functions/methods (not async/generators)
 *   return H.ret(line,(value)) for every `return` inside such a framed function
 *   x => {H.enter(..);try{return H.ret(line,(expr))}finally{H.exit()}}   NAMED expression arrows
 *                              (`const fib = n => ...`): framed, so recursion is traced and limited
 *   x => (H.tick(line),expr)   anonymous inline expression arrows (comparators, callbacks): counted
 *                              against the step/time limits but not recorded
 *   R = ()=>({l:[["name",()=>name],...],s:()=>this})  lists every binding visible at the site
 *       (functions/classes excluded); the runtime calls each getter in try/catch, so TDZ reads are skipped.
 */

export { TracerSyntaxError };
export type { FunctionInfo };

export interface ClassInfo {
  name: string;
  line: number;
}

export interface InstrumentResult {
  code: string;
  hooksName: string;
  /** Every top-level binding (var/let/const/function/class), source order. */
  topLevelNames: string[];
  /** Top-level classes (`class X {}` and `const X = class {}`), source order. */
  classes: ClassInfo[];
  functions: FunctionInfo[];
}

export const PARSE_OPTIONS: Options = {
  ecmaVersion: "latest",
  sourceType: "script",
  strict: true,
  locations: true,
  preserveParens: true,
};

const HOOKS_BASE_NAME = "__t";
const ACORN_LOCATION_SUFFIX = /\s*\(\d+:\d+\)$/;

interface AcornSyntaxError extends SyntaxError {
  loc?: { line: number; column: number };
}

function toTracerSyntaxError(error: unknown): unknown {
  if (!(error instanceof SyntaxError)) return error;
  const { loc } = error as AcornSyntaxError;
  const message = error.message.replace(ACORN_LOCATION_SUFFIX, "");
  return new TracerSyntaxError(message, loc?.line ?? null, loc ? loc.column + 1 : null);
}

/** Parses user code exactly as the tracer runs it (strict-mode script). Throws TracerSyntaxError. */
export function parseProgram(code: string): Program {
  try {
    return parse(code, PARSE_OPTIONS);
  } catch (error) {
    throw toTracerSyntaxError(error);
  }
}

function chooseHooksName(code: string): string {
  let name = HOOKS_BASE_NAME;
  for (let suffix = 1; code.includes(name); suffix++) name = `${HOOKS_BASE_NAME}${suffix}`;
  return name;
}

function topLevelNames(program: Program): string[] {
  return [...new Set(hoistedBindings(program.body).map((binding) => binding.name))];
}

function topLevelClasses(program: Program): ClassInfo[] {
  const classes: ClassInfo[] = [];
  for (const statement of program.body) {
    if (statement.type === "ClassDeclaration") classes.push({ name: statement.id.name, line: startLine(statement) });
    if (statement.type !== "VariableDeclaration") continue;
    for (const declarator of statement.declarations) {
      const isClass = declarator.init ? unwrapParens(declarator.init).type === "ClassExpression" : false;
      if (isClass && declarator.id.type === "Identifier") classes.push({ name: declarator.id.name, line: startLine(declarator) });
    }
  }
  return classes;
}

export function instrument(code: string): InstrumentResult {
  const program = parseProgram(code);
  const hooksName = chooseHooksName(code);
  const instrumenter = new Instrumenter(hooksName);
  return {
    code: instrumenter.instrument(code, program),
    hooksName,
    topLevelNames: topLevelNames(program),
    classes: topLevelClasses(program),
    functions: instrumenter.functions,
  };
}
