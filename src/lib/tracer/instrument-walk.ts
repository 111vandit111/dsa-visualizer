import type {
  AnonymousClassDeclaration,
  AnonymousFunctionDeclaration,
  AnyNode,
  ArrowFunctionExpression,
  BlockStatement,
  CatchClause,
  ClassDeclaration,
  ClassExpression,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  IfStatement,
  MethodDefinition,
  Pattern,
  PrivateIdentifier,
  Program,
  PropertyDefinition,
  ReturnStatement,
  Statement,
  SwitchStatement,
} from "acorn";
import { TracerSyntaxError } from "./instrument-error";
import { Splicer } from "./instrument-splice";
import {
  hoistedBindings,
  lexicalBindings,
  loopBindings,
  patternBindings,
  visibleNames,
  type LoopStatement,
  type Scope,
  type StatementLike,
} from "./instrument-scope";

/** A function or method found in the source; `className` is set for direct class members and `X.prototype.m = function`. */
export interface FunctionInfo {
  name: string;
  line: number;
  className: string | null;
}

type FunctionNode = FunctionDeclaration | AnonymousFunctionDeclaration | FunctionExpression | ArrowFunctionExpression;
type ClassNode = ClassDeclaration | AnonymousClassDeclaration | ClassExpression;
interface NameHint {
  name: string;
  className: string | null;
}

export const ANONYMOUS_NAME = "(anonymous)";
const COMPUTED_NAME = "(computed)";
const CONSTRUCTOR_NAME = "constructor";
const RETURN_KEYWORD = "return";
const MAX_SCOPE_BINDINGS = 64;
const SILENT_STATEMENTS: ReadonlySet<string> = new Set(["FunctionDeclaration", "ClassDeclaration", "EmptyStatement", "BlockStatement"]);
const UNSAFE_STRING_CHARS = /[\u2028\u2029]/g;

export function startLine(node: AnyNode): number {
  if (!node.loc) throw new Error("The parser must run with `locations: true`");
  return node.loc.start.line;
}

/** 1-based, like RunError.column. */
function startColumn(node: AnyNode): number {
  if (!node.loc) throw new Error("The parser must run with `locations: true`");
  return node.loc.start.column + 1;
}

function endLine(node: AnyNode): number {
  if (!node.loc) throw new Error("The parser must run with `locations: true`");
  return node.loc.end.line;
}

function quote(text: string): string {
  return JSON.stringify(text).replace(UNSAFE_STRING_CHARS, (char) => `\\u${char.charCodeAt(0).toString(16)}`);
}

function isNode(value: unknown): value is AnyNode {
  return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

function needsStep(statement: StatementLike): boolean {
  if (SILENT_STATEMENTS.has(statement.type)) return false;
  return !(statement.type === "ExpressionStatement" && statement.directive !== undefined);
}

function keyName(key: Expression | PrivateIdentifier, isComputed: boolean): string {
  if (key.type === "Literal") return String(key.value);
  if (isComputed) return COMPUTED_NAME;
  if (key.type === "Identifier") return key.name;
  return key.type === "PrivateIdentifier" ? `#${key.name}` : COMPUTED_NAME;
}

function memberName(member: MethodDefinition | PropertyDefinition): string {
  if (member.type === "MethodDefinition" && member.kind === "constructor") return CONSTRUCTOR_NAME;
  return keyName(member.key, member.computed);
}

/** `Foo.prototype.bar = function () {}` -> class "Foo". */
function prototypeOwner(target: Expression): string | null {
  if (target.type !== "MemberExpression" || target.computed) return null;
  const isPrototype = target.property.type === "Identifier" && target.property.name === "prototype";
  return isPrototype && target.object.type === "Identifier" ? target.object.name : null;
}

function assignmentHint(left: Pattern): NameHint | undefined {
  if (left.type === "Identifier") return { name: left.name, className: null };
  if (left.type !== "MemberExpression" || left.computed || left.property.type !== "Identifier") return undefined;
  return { name: left.property.name, className: left.object.type === "Super" ? null : prototypeOwner(left.object) };
}

/**
 * Inserts tracer hook calls into the original source text (see instrument.ts for the hook protocol).
 * One instance per instrumentation run.
 */
export class Instrumenter {
  readonly functions: FunctionInfo[] = [];
  private readonly splicer = new Splicer();
  private readonly scopes: Scope[] = [];
  private readonly framedFunctions: boolean[] = [];

  constructor(private readonly hooks: string) {}

  instrument(source: string, program: Program): string {
    this.withScope(hoistedBindings(program.body), () => this.visitStatements(program.body));
    return this.splicer.apply(source);
  }

  private withScope(bindings: Scope, visit: () => void): void {
    this.scopes.push(bindings);
    visit();
    this.scopes.pop();
  }

  private reader(): string {
    const names = visibleNames(this.scopes, MAX_SCOPE_BINDINGS);
    const locals = names.map((name) => `[${quote(name)},()=>${name}]`).join(",");
    return `()=>({l:[${locals}],s:()=>this})`;
  }

  private stepCall(statement: StatementLike): string {
    return `;${this.hooks}.step(${startLine(statement)},${this.reader()});`;
  }

  private loopCall(line: number): string {
    return `${this.hooks}.loop(${line},${this.reader()});`;
  }

  private visit(node: AnyNode | null | undefined, hint?: NameHint): void {
    if (!node) return;
    switch (node.type) {
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        return this.visitFunction(node, hint);
      case "ClassDeclaration":
      case "ClassExpression":
        return this.visitClass(node, hint);
      case "ParenthesizedExpression":
        return this.visit(node.expression, hint);
      case "BlockStatement":
        return this.visitBlock(node, null);
      case "IfStatement":
        return this.visitIf(node);
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement":
      case "WhileStatement":
      case "DoWhileStatement":
        return this.visitLoop(node);
      case "SwitchStatement":
        return this.visitSwitch(node);
      case "CatchClause":
        return this.visitCatch(node);
      case "ReturnStatement":
        return this.visitReturn(node);
      case "VariableDeclarator":
        this.visit(node.id);
        return this.visit(node.init, node.id.type === "Identifier" ? { name: node.id.name, className: null } : undefined);
      case "AssignmentExpression":
        this.visit(node.left);
        return this.visit(node.right, assignmentHint(node.left));
      case "Property":
        if (node.computed) this.visit(node.key);
        return this.visit(node.value, { name: keyName(node.key, node.computed), className: null });
      case "ImportExpression":
        // Would load and run code outside the tracer (and hit the network with the visitor's cookies).
        throw new TracerSyntaxError("Dynamic import() is not allowed in solution code", startLine(node), startColumn(node));
      default:
        return this.visitChildren(node);
    }
  }

  private visitChildren(node: AnyNode): void {
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) if (isNode(item)) this.visit(item);
      } else if (isNode(value)) {
        this.visit(value);
      }
    }
  }

  private visitStatements(statements: readonly StatementLike[]): void {
    for (const statement of statements) {
      if (needsStep(statement)) this.splicer.insert(statement.start, this.stepCall(statement));
      this.visit(statement);
    }
  }

  private visitBlock(block: BlockStatement, loopLine: number | null): void {
    this.withScope(lexicalBindings(block.body), () => {
      if (loopLine !== null) this.splicer.insert(block.start + 1, this.loopCall(loopLine));
      this.visitStatements(block.body);
    });
  }

  /** Body of if/else/loops: single statements are wrapped in `{}` so they can get their own hooks. */
  private visitBody(body: Statement | null | undefined, loopLine: number | null): void {
    if (!body) return;
    if (body.type === "BlockStatement") return this.visitBlock(body, loopLine);
    if (body.type === "EmptyStatement" && loopLine === null) return;
    this.splicer.insert(body.start, "{");
    if (loopLine !== null) this.splicer.insert(body.start, this.loopCall(loopLine));
    if (needsStep(body)) this.splicer.insert(body.start, this.stepCall(body));
    this.visit(body);
    this.splicer.insert(body.end, "}");
  }

  private visitIf(node: IfStatement): void {
    this.visit(node.test);
    this.visitBody(node.consequent, null);
    this.visitBody(node.alternate, null);
  }

  private visitLoop(loop: LoopStatement): void {
    this.withScope(loopBindings(loop), () => {
      if (loop.type === "ForStatement") {
        this.visit(loop.init);
        this.visit(loop.test);
        this.visit(loop.update);
      } else if (loop.type === "ForInStatement" || loop.type === "ForOfStatement") {
        this.visit(loop.left);
        this.visit(loop.right);
      } else if (loop.type === "WhileStatement") {
        this.visit(loop.test);
      }
      this.visitBody(loop.body, startLine(loop));
      if (loop.type === "DoWhileStatement") this.visit(loop.test);
    });
  }

  private visitSwitch(node: SwitchStatement): void {
    this.visit(node.discriminant);
    this.withScope(lexicalBindings(node.cases.flatMap((switchCase) => switchCase.consequent)), () => {
      for (const switchCase of node.cases) {
        this.visit(switchCase.test);
        this.visitStatements(switchCase.consequent);
      }
    });
  }

  private visitCatch(node: CatchClause): void {
    this.withScope(patternBindings([node.param]), () => {
      this.visit(node.param);
      this.visitBlock(node.body, null);
    });
  }

  private visitReturn(node: ReturnStatement): void {
    const isFramed = this.framedFunctions[this.framedFunctions.length - 1] ?? false;
    if (!isFramed) return this.visit(node.argument);
    const line = startLine(node);
    const { argument } = node;
    if (!argument) {
      this.splicer.insert(node.start + RETURN_KEYWORD.length, ` ${this.hooks}.ret(${line},void 0)`);
      return;
    }
    this.splicer.insert(argument.start, `${this.hooks}.ret(${line},(`);
    this.visit(argument);
    this.splicer.insert(argument.end, "))");
  }

  private visitFunction(fn: FunctionNode, hint: NameHint | undefined): void {
    const name = fn.id?.name ?? hint?.name ?? ANONYMOUS_NAME;
    const line = startLine(fn);
    this.functions.push({ name, line, className: hint?.className ?? null });
    const { body } = fn;
    const isBlockBody = body.type === "BlockStatement";
    const hoisted = isBlockBody ? hoistedBindings(body.body) : [];
    // Lexical body declarations move into the inserted `try {}` block, so the entry hook only sees params + vars.
    const paramScope = [...patternBindings(fn.params), ...hoisted.filter((binding) => !binding.isLexical)];
    // Expression arrows get a frame only when named (`const fib = n => ...`); inline callbacks just tick.
    const isFramed = !fn.async && !fn.generator && (isBlockBody || hint !== undefined);
    this.framedFunctions.push(isFramed);
    this.withScope(paramScope, () => {
      for (const param of fn.params) this.visit(param);
      if (body.type !== "BlockStatement") return this.visitExpressionBody(body, name, line, isFramed);
      if (isFramed) this.splicer.insert(body.start + 1, `${this.hooks}.enter(${quote(name)},${line},${this.reader()});try{`);
      this.withScope(hoisted.filter((binding) => binding.isLexical), () => this.visitStatements(body.body));
      if (isFramed) this.splicer.insert(body.end - 1, `;${this.hooks}.fall(${endLine(body)});}finally{${this.hooks}.exit()}`);
    });
    this.framedFunctions.pop();
  }

  /** Every expression-bodied arrow is hooked, so limits also stop e.g. `const fib = n => fib(n - 1) + fib(n - 2)`. */
  private visitExpressionBody(body: Expression, name: string, line: number, isFramed: boolean): void {
    const { hooks } = this;
    const opener = isFramed
      ? `{${hooks}.enter(${quote(name)},${line},${this.reader()});try{return ${hooks}.ret(${line},(`
      : `(${hooks}.tick(${line}),`;
    this.splicer.insert(body.start, opener);
    this.visit(body);
    this.splicer.insert(body.end, isFramed ? `))}finally{${hooks}.exit()}}` : ")");
  }

  private visitClass(node: ClassNode, hint: NameHint | undefined): void {
    const className = node.id?.name ?? hint?.name ?? null;
    this.visit(node.superClass);
    for (const member of node.body.body) {
      if (member.type === "StaticBlock") {
        this.withScope(hoistedBindings(member.body), () => this.visitStatements(member.body));
        continue;
      }
      if (member.computed) this.visit(member.key);
      this.visit(member.value, { name: memberName(member), className });
    }
  }
}
