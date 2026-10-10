// Structural validator for hook payloads — the reason hooks carry no runtime
// dependency. Plugin install is a plain file copy, so a dependency here is
// never installed: every hook would die on ERR_MODULE_NOT_FOUND and, because
// hook failures are non-blocking, the gates would fail open silently.
//
// Surface: string (regex/length), number, unknown, array, record, object
// (optional/nullish/passthrough) with zod-shaped safeParse results.

export interface SchemaIssue {
  path: PropertyKey[];
  message: string;
}

export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: SchemaIssue[] } };

export interface Schema<T> {
  safeParse(value: unknown): SafeParseResult<T>;
  optional(): Schema<T | undefined>;
  nullish(): Schema<T | null | undefined>;
}

export interface StringSchema extends Schema<string> {
  regex(pattern: RegExp): StringSchema;
  length(count: number): StringSchema;
}

export interface ObjectSchema<T> extends Schema<T> {
  passthrough(): ObjectSchema<T & { [key: string]: unknown }>;
}

export type Infer<S> = S extends Schema<infer T> ? T : never;

/** Constraint for the schema handed to defineHook; replaces the old `ZodType`. */
export type ZodType<T = unknown> = Schema<T>;

const INVALID = Symbol('invalid');

type Checker = (value: unknown, path: PropertyKey[], issues: SchemaIssue[]) => unknown | typeof INVALID;

type Shape = Record<string, Schema<unknown>>;

function report(issues: SchemaIssue[], path: PropertyKey[], message: string): void {
  issues.push({ path, message });
}

function isPlainObject(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collect(prefix: PropertyKey[], result: SafeParseResult<unknown>, key: PropertyKey, issues: SchemaIssue[]): void {
  for (const issue of result.error.issues) {
    report(issues, [...prefix, key, ...issue.path], issue.message);
  }
}

class SchemaImpl<T> implements Schema<T> {
  protected readonly check: Checker;

  constructor(check: Checker) {
    this.check = check;
  }

  safeParse(value: unknown): SafeParseResult<T> {
    const issues: SchemaIssue[] = [];
    const data = this.check(value, [], issues);
    if (data === INVALID) return { success: false, error: { issues } };
    return { success: true, data: data as T };
  }

  optional(): Schema<T | undefined> {
    const inner = this.check;
    return new SchemaImpl<T | undefined>((value, path, issues) =>
      value === undefined ? undefined : inner(value, path, issues));
  }

  nullish(): Schema<T | null | undefined> {
    const inner = this.check;
    return new SchemaImpl<T | null | undefined>((value, path, issues) =>
      value === undefined || value === null ? value : inner(value, path, issues));
  }
}

class StringSchemaImpl extends SchemaImpl<string> implements StringSchema {
  private refine(validate: (value: string) => string | null, message: string): StringSchema {
    const inner = this.check;
    return new StringSchemaImpl((value, path, issues) => {
      const base = inner(value, path, issues);
      if (base === INVALID) return INVALID;
      const refined = validate(base as string);
      if (refined === null) {
        report(issues, path, message);
        return INVALID;
      }
      return refined;
    });
  }

  regex(pattern: RegExp): StringSchema {
    return this.refine((value) => (pattern.test(value) ? value : null), `must match ${pattern}`);
  }

  length(count: number): StringSchema {
    return this.refine((value) => (value.length === count ? value : null), `must be exactly ${count} characters`);
  }
}

class ObjectSchemaImpl<T> extends SchemaImpl<T> implements ObjectSchema<T> {
  private readonly fields: Shape;

  constructor(fields: Shape, keepUnknown: boolean) {
    super(objectChecker(fields, keepUnknown));
    this.fields = fields;
  }

  passthrough(): ObjectSchema<T & { [key: string]: unknown }> {
    return new ObjectSchemaImpl<T & { [key: string]: unknown }>(this.fields, true);
  }
}

function objectChecker(fields: Shape, keepUnknown: boolean): Checker {
  return (value, path, issues) => {
    if (!isPlainObject(value)) {
      report(issues, path, 'expected object');
      return INVALID;
    }
    const out: { [key: string]: unknown } = {};
    let ok = true;
    for (const [key, child] of Object.entries(fields)) {
      const present = key in value;
      const result = child.safeParse(present ? value[key] : undefined);
      if (!result.success) {
        ok = false;
        collect(path, result, key, issues);
        continue;
      }
      // Absent optional keys stay absent, matching the previous zod output.
      if (present) out[key] = result.data;
    }
    if (keepUnknown) {
      for (const [key, item] of Object.entries(value)) {
        if (!(key in fields)) out[key] = item;
      }
    }
    return ok ? out : INVALID;
  };
}

const stringChecker: Checker = (value, path, issues) => {
  if (typeof value !== 'string') {
    report(issues, path, 'expected string');
    return INVALID;
  }
  return value;
};

const numberChecker: Checker = (value, path, issues) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    report(issues, path, 'expected number');
    return INVALID;
  }
  return value;
};

export const z = {
  string(): StringSchema {
    return new StringSchemaImpl(stringChecker);
  },

  number(): Schema<number> {
    return new SchemaImpl<number>(numberChecker);
  },

  unknown(): Schema<unknown> {
    return new SchemaImpl<unknown>((value) => value);
  },

  array(element: Schema<unknown>): Schema<unknown[]> {
    return new SchemaImpl<unknown[]>((value, path, issues) => {
      if (!Array.isArray(value)) {
        report(issues, path, 'expected array');
        return INVALID;
      }
      const out: unknown[] = [];
      let ok = true;
      value.forEach((item, index) => {
        const result = element.safeParse(item);
        if (result.success) out[index] = result.data;
        else {
          ok = false;
          collect(path, result, index, issues);
        }
      });
      return ok ? out : INVALID;
    });
  },

  record(
    keySchema: Schema<unknown>,
    valueSchema: Schema<unknown>,
  ): Schema<{ [key: string]: unknown }> {
    return new SchemaImpl<{ [key: string]: unknown }>((value, path, issues) => {
      if (!isPlainObject(value)) {
        report(issues, path, 'expected object');
        return INVALID;
      }
      const out: { [key: string]: unknown } = {};
      let ok = true;
      for (const [key, item] of Object.entries(value)) {
        const keyResult = keySchema.safeParse(key);
        const result = valueSchema.safeParse(item);
        if (keyResult.success && result.success) {
          out[key] = result.data;
          continue;
        }
        ok = false;
        if (!keyResult.success) collect(path, keyResult, key, issues);
        if (!result.success) collect(path, result, key, issues);
      }
      return ok ? out : INVALID;
    });
  },

  object<S extends Shape>(shape: S): ObjectSchema<{ [K in keyof S]: Infer<S[K]> }> {
    return new ObjectSchemaImpl<{ [K in keyof S]: Infer<S[K]> }>(shape, false);
  },
};
