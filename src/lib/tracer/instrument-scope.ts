import type {
  DoWhileStatement,
  Expression,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  ModuleDeclaration,
  Pattern,
  Statement,
  VariableDeclaration,
  WhileStatement,
} from "acorn";

/** One name declared in a scope. Hidden bindings (functions/classes) shadow outer names but are never listed. */
export interface Binding {
  name: string;
  isHidden: boolean;
  isLexical: boolean;
}

export type Scope = readonly Binding[];
export type StatementLike = Statement | ModuleDeclaration;
export type LoopStatement = ForStatement | ForInStatement | ForOfStatement | WhileStatement | DoWhileStatement;

export function unwrapParens(node: Expression): Expression {
  let current = node;
  while (current.type === "ParenthesizedExpression") current = current.expression;
  return current;
}

export function isFunctionLike(node: Expression | null | undefined): boolean {
  if (!node) return false;
  const inner = unwrapParens(node);
  return inner.type === "FunctionExpression" || inner.type === "ArrowFunctionExpression" || inner.type === "ClassExpression";
}

function collectPatternNames(pattern: Pattern, names: string[]): void {
  switch (pattern.type) {
    case "Identifier":
      names.push(pattern.name);
      return;
    case "ObjectPattern":
      for (const property of pattern.properties) {
        collectPatternNames(property.type === "RestElement" ? property.argument : property.value, names);
      }
      return;
    case "ArrayPattern":
      for (const element of pattern.elements) if (element) collectPatternNames(element, names);
      return;
    case "RestElement":
      collectPatternNames(pattern.argument, names);
      return;
    case "AssignmentPattern":
      collectPatternNames(pattern.left, names);
      return;
    default:
      return; // member-expression targets bind nothing
  }
}

export function patternNames(pattern: Pattern | null | undefined): string[] {
  const names: string[] = [];
  if (pattern) collectPatternNames(pattern, names);
  return names;
}

export function patternBindings(patterns: readonly (Pattern | null | undefined)[]): Binding[] {
  return patterns.flatMap((pattern) => patternNames(pattern).map((name) => ({ name, isHidden: false, isLexical: false })));
}

/** `const f = () => {}` is treated like a function declaration: it shadows, but is not shown as a variable. */
function declarationBindings(declaration: VariableDeclaration): Binding[] {
  const isLexical = declaration.kind !== "var";
  return declaration.declarations.flatMap((declarator) => {
    const isHidden = declarator.id.type === "Identifier" && isFunctionLike(declarator.init);
    return patternNames(declarator.id).map((name) => ({ name, isHidden, isLexical }));
  });
}

function isLexicalDeclaration(statement: StatementLike): boolean {
  if (statement.type === "VariableDeclaration") return statement.kind !== "var";
  return statement.type === "FunctionDeclaration" || statement.type === "ClassDeclaration";
}

/** let/const/class/function declared directly in a statement list (block-scoped in strict mode). */
export function lexicalBindings(statements: readonly StatementLike[]): Binding[] {
  const bindings: Binding[] = [];
  for (const statement of statements) {
    if (statement.type === "VariableDeclaration" && statement.kind !== "var") {
      bindings.push(...declarationBindings(statement));
    } else if (statement.type === "FunctionDeclaration" || statement.type === "ClassDeclaration") {
      bindings.push({ name: statement.id.name, isHidden: true, isLexical: true });
    }
  }
  return bindings;
}

function collectVars(statement: StatementLike | null | undefined, out: Binding[]): void {
  if (!statement) return;
  switch (statement.type) {
    case "VariableDeclaration":
      if (statement.kind === "var") out.push(...declarationBindings(statement));
      return;
    case "BlockStatement":
      for (const inner of statement.body) collectVars(inner, out);
      return;
    case "IfStatement":
      collectVars(statement.consequent, out);
      collectVars(statement.alternate, out);
      return;
    case "ForStatement":
      if (statement.init?.type === "VariableDeclaration") collectVars(statement.init, out);
      collectVars(statement.body, out);
      return;
    case "ForInStatement":
    case "ForOfStatement":
      if (statement.left.type === "VariableDeclaration") collectVars(statement.left, out);
      collectVars(statement.body, out);
      return;
    case "WhileStatement":
    case "DoWhileStatement":
    case "LabeledStatement":
    case "WithStatement":
      collectVars(statement.body, out);
      return;
    case "TryStatement":
      collectVars(statement.block, out);
      collectVars(statement.handler?.body, out);
      collectVars(statement.finalizer, out);
      return;
    case "SwitchStatement":
      for (const switchCase of statement.cases) for (const inner of switchCase.consequent) collectVars(inner, out);
      return;
    default:
      return;
  }
}

/**
 * Bindings owned by a function-like body (program, function body, static block), in source order:
 * `var`s hoisted from nested blocks plus the body's own lexical declarations.
 */
export function hoistedBindings(statements: readonly StatementLike[]): Binding[] {
  const bindings: Binding[] = [];
  for (const statement of statements) {
    if (isLexicalDeclaration(statement)) bindings.push(...lexicalBindings([statement]));
    else collectVars(statement, bindings);
  }
  return bindings;
}

function loopHead(loop: LoopStatement): VariableDeclaration | null {
  if (loop.type === "ForStatement") return loop.init?.type === "VariableDeclaration" ? loop.init : null;
  if (loop.type === "ForInStatement" || loop.type === "ForOfStatement") {
    return loop.left.type === "VariableDeclaration" ? loop.left : null;
  }
  return null;
}

/** let/const declared in a for / for-in / for-of head (visible in the loop body). */
export function loopBindings(loop: LoopStatement): Binding[] {
  const head = loopHead(loop);
  return head && head.kind !== "var" ? declarationBindings(head) : [];
}

/**
 * Names readable at a site: innermost scope wins, hidden names shadow without being listed,
 * capped at `limit` (innermost first). Returned outermost-first, each scope in declaration order.
 */
export function visibleNames(scopes: readonly Scope[], limit: number): string[] {
  const seen = new Set<string>();
  const perScope: string[][] = [];
  let count = 0;
  for (let index = scopes.length - 1; index >= 0; index--) {
    const names: string[] = [];
    for (const binding of scopes[index]) {
      if (seen.has(binding.name)) continue;
      seen.add(binding.name);
      if (binding.isHidden || count >= limit) continue;
      names.push(binding.name);
      count++;
    }
    perScope.push(names);
  }
  return perScope.reverse().flat();
}
