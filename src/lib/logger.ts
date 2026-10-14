function describe(value: unknown): unknown {
  return value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
}

export const logger = {
  error(message: string, context: Record<string, unknown> = {}): void {
    const safeContext = Object.fromEntries(Object.entries(context).map(([key, value]) => [key, describe(value)]));
    console.error(message, safeContext);
  },
};
