// All exit helpers write to stderr (SC7: no stdout block residuals)

export function exitBlock(message: string): never {
  process.stderr.write(JSON.stringify({ systemMessage: `BLOCKED: ${message}` }) + '\n');
  process.exit(2);
}

export function exitDeny(message: string): never {
  process.stderr.write(JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: message }) + '\n');
  process.exit(2);
}

export function exitAdvisory(message: string): never {
  process.stderr.write(JSON.stringify({ systemMessage: message }) + '\n');
  process.exit(0);
}

export function exitDrift(message: string): never {
  process.stderr.write(message + '\n');
  process.exit(1);
}

export function exitAllow(): never {
  process.exit(0);
}
