# Example: 3-Layer Boundary on a Login Endpoint

A single concrete usage, showing a 3-layer boundary applied to a new endpoint, with the corresponding security tests. Each layer maps to one procedure step and one OWASP class.

```typescript
// Step 1+2: identify input boundaries + validate at the edge
// Schema validates at the HTTP boundary BEFORE business logic touches the input
import { z } from 'zod';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const SALT_ROUNDS = 12;

const LoginSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

// Step 3 Layer 1: input validation at the boundary
app.post('/api/auth/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),  // Step 3 Layer 2: rate-limit auth
  async (req, res) => {
    const result = LoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({  // Generic error, no internals leaked
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
      });
    }
    const { email, password } = result.data;

    // Step 3 Layer 2: authentication (who) — bcrypt compare, NEVER store plaintext
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      // Constant-time-ish: same response shape, same timing budget
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Step 3 Layer 2: authorization (whether) — not needed for self-login,
    // but every OTHER endpoint on this user must check `task.ownerId === req.user.id`

    // Step 3 Layer 2: session cookie — httpOnly, secure, sameSite
    const session = await sessionStore.create({ userId: user.id });
    res.cookie('session', session.id, {
      httpOnly: true,    // Not accessible via JS (XSS protection)
      secure: true,      // HTTPS only
      sameSite: 'lax',   // CSRF protection
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Step 3 Layer 3: secrets come from env, never from code
    // process.env.SESSION_SECRET, process.env.DATABASE_URL — set in deploy env, NOT in this file
    return res.json({ user: sanitizeUser(user) });  // Strip passwordHash, resetToken, etc.
  },
);

// Step 4: framework primitives configured correctly
app.use(helmet());  // CSP, HSTS, X-Frame-Options, X-Content-Type-Options — defaults are sane
// CORS: explicit allowlist, no wildcard with credentials
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000',
  credentials: true,
}));

// Step 6: pre-commit secret scan
// $ git diff --cached | grep -iE "password|secret|api_key|token|private_key"
// (no output = clean; if hit, rotate the secret, not just remove from diff)


// 3-layer boundary tests (vitest / jest)
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

describe('POST /api/auth/login — 3-layer boundary', () => {
  // Layer 1: input validation
  it('rejects malformed email with 422', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'correcthorse' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects oversize password with 422 (prevents bcrypt DoS)', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'x'.repeat(129) });
    expect(res.status).toBe(422);
  });

  // Layer 2: auth/authz
  it('returns 401 with same shape for unknown email vs wrong password (no enumeration)', async () => {
    const r1 = await request(app).post('/api/auth/login')
      .send({ email: 'unknown@x.com', password: 'whatever12' });
    const r2 = await request(app).post('/api/auth/login')
      .send({ email: 'known@x.com', password: 'wrongpass1' });
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
    expect(r1.body.error.code).toBe(r2.body.error.code);
  });

  it('rate-limits auth attempts at 11th request in 15min window', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login')
        .send({ email: 'a@b.com', password: 'wrongpass1' });
    }
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrongpass1' });
    expect(res.status).toBe(429);  // Too Many Requests
  });

  it('sets session cookie with httpOnly, secure, sameSite', async () => {
    // Stub bcrypt to return success
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'known@x.com', password: 'correcthorse' });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  // Layer 3: secret management
  it('does not log the password on failed auth', async () => {
    const logSpy = vi.spyOn(console, 'log');
    await request(app).post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'supersecret' });
    const logged = logSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain('supersecret');
  });

  it('does not return passwordHash in the user object', async () => {
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'known@x.com', password: 'correcthorse' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('resetToken');
  });
});
```

The example above maps to: 3 procedure steps (validate at edge, 3-layer system, framework primitives) + 3 OWASP classes (Injection / Broken Auth / Sensitive Data Exposure) + 7 boundary tests across the 3 layers. The key insight: **the boundary is the test target**, not the happy path. A login endpoint with 1 happy-path test is a login endpoint that ships the next breach.