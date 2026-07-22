import { z } from 'zod';

// Envelope: passthrough — unknown keys accepted and preserved (SC8)
export const envelopeSchema = z.object({
  hook_event_name: z.string().optional(),
  tool_name: z.string().optional(),
  tool_input: z.record(z.string(), z.unknown()).optional(),
  tool_response: z.unknown().optional(),
  session_id: z.string().optional(),
  transcript_path: z.string().optional(),
}).passthrough();

export type Envelope = z.infer<typeof envelopeSchema>;
