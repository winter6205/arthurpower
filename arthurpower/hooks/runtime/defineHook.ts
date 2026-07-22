import { z } from 'zod';
import { envelopeSchema, type Envelope } from './schema.ts';
import { exitBlock, exitDeny, exitAdvisory, exitDrift, exitAllow } from './exit.ts';

export type HookResult =
  | { kind: 'allow' }
  | { kind: 'block'; message: string }
  | { kind: 'deny'; message: string }
  | { kind: 'advisory'; message: string }
  | { kind: 'drift'; message: string };

export interface HookContext {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response?: unknown;
  envelope: Envelope;
}

export interface DefineHookConfig<T extends z.ZodType = z.ZodType> {
  schema: T;
  failOpen?: boolean;
  handler: (ctx: HookContext & { tool_input: z.infer<T> }) => Promise<HookResult> | HookResult;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let buf = '';
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(value);
    };
    const armTimeout = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => finish(buf), 1000);
    };
    try { process.stdin.setEncoding('utf8'); } catch { finish(''); return; }
    process.stdin.on('data', (chunk: string) => { buf += chunk; armTimeout(); });
    process.stdin.on('end', () => finish(buf));
    process.stdin.on('error', () => finish(buf));
    armTimeout();
  });
}

function failValidation(failOpen: boolean): void {
  if (failOpen) exitAllow();
  process.exit(2);
}

function formatFatalError(err: unknown): string {
  return err instanceof Error ? (err.stack ?? err.message) : String(err);
}

export async function runHook<T extends z.ZodType>(config: DefineHookConfig<T>): Promise<void> {
  const { schema, failOpen = true, handler } = config;
  const raw = await readStdin();
  let envelope: Envelope;
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    const result = envelopeSchema.safeParse(parsed);
    if (!result.success) { failValidation(failOpen); return; }
    envelope = result.data;
  } catch { failValidation(failOpen); return; }
  const schemaResult = schema.safeParse(envelope.tool_input ?? {});
  if (!schemaResult.success) { failValidation(failOpen); return; }
  const ctx = { tool_name: envelope.tool_name ?? '', tool_input: schemaResult.data as z.infer<T>, tool_response: envelope.tool_response, envelope } as HookContext & { tool_input: z.infer<T> };
  let result: HookResult;
  try { result = await handler(ctx); } catch (err) { process.stderr.write(`[defineHook FATAL] ${formatFatalError(err)}\n`); exitAllow(); return; }
  switch (result.kind) { case 'allow': exitAllow(); break; case 'block': exitBlock(result.message); break; case 'deny': exitDeny(result.message); break; case 'advisory': exitAdvisory(result.message); break; case 'drift': exitDrift(result.message); break; }
}

export function defineHook<T extends z.ZodType>(config: DefineHookConfig<T>) {
  runHook(config).catch((err: unknown) => { process.stderr.write(`[defineHook FATAL] ${formatFatalError(err)}\n`); process.exit(0); });
  return () => runHook(config);
}

