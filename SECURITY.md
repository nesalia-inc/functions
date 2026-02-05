# Security Policy

## Supported Versions

Currently, only the latest version of DeesseJS Functions receives security updates.

| Version | Supported |
|---------|-----------|
| Latest (0.x.x) | ✅ |
| Older versions | ❌ |

We strongly recommend keeping your dependencies up to date to ensure you receive security patches.

## Reporting a Vulnerability

We take the security of DeesseJS Functions seriously. If you discover a security vulnerability, please follow these guidelines:

### How to Report

**Do NOT open a public issue.** Instead, send your report privately:

**Email:** [contact@developerssecrets.com](mailto:contact@developerssecrets.com)

**Please include:**

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested mitigations or fixes (if known)

### What to Expect

1. **Confirmation:** You should receive a response within 48 hours confirming receipt of your report
2. **Investigation:** We will investigate the vulnerability and determine its severity
3. **Resolution:** We will work on a fix and determine a timeline for disclosure
4. **Disclosure:** We will coordinate with you on the public disclosure of the vulnerability

### Timeline

- **Critical vulnerabilities:** Aim to fix within 7 days
- **High severity:** Aim to fix within 14 days
- **Medium severity:** Aim to fix within 30 days
- **Low severity:** Address in next regular release

## Security Best Practices

### Input Validation

Always use Zod schemas to validate and sanitize inputs:

```typescript
// ✅ Good - Input validation with Zod
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
  }),
  handler: async (ctx, args) => {
    // args is validated and type-safe
    return success(await ctx.db.users.create(args));
  },
});

// ❌ Bad - No input validation
const createUser = t.mutation({
  args: z.object({}),
  handler: async (ctx, args) => {
    // args could contain anything!
    return success(await ctx.db.users.create(args));
  },
});
```

### Context Security

Never expose sensitive information in the context:

```typescript
// ❌ Bad - Exposing secrets in context
const { t } = defineContext<{
  apiKey: string;
  password: string;
}>({
  apiKey: process.env.API_KEY,
  password: process.env.PASSWORD,
});

// ✅ Good - Only expose necessary, non-sensitive data
const { t } = defineContext<{
  userId: string;
  permissions: string[];
}>({
  userId: getUserFromSession(request).id,
  permissions: getUserPermissions(request),
});
```

### Error Handling

Don't expose sensitive information in error messages:

```typescript
// ❌ Bad - Exposing database details
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    try {
      return success(await ctx.db.query(
        `SELECT * FROM users WHERE id = ${args.id}`
      ));
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  },
});

// ✅ Good - Generic error messages
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.users.find(args.id);
      if (!user) {
        return failureOutcome(Causes.notFound(args.id, 'User'));
      }
      return success(user);
    } catch (error) {
      return failureOutcome(
        cause({ name: 'InternalError', message: 'Failed to fetch user' })
      );
    }
  },
});
```

### Authorization

Always check permissions in your handlers:

```typescript
// ✅ Good - Check permissions before action
const deleteUser = t.mutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // Check if user has admin permission
    if (!ctx.permissions.includes('admin')) {
      return failureOutcome(
        cause({ name: 'Forbidden', message: 'Insufficient permissions' })
      );
    }

    // Check if user is not deleting themselves
    if (args.id === ctx.userId) {
      return failureOutcome(
        cause({ name: 'InvalidOperation', message: 'Cannot delete yourself' })
      );
    }

    await ctx.db.users.delete(args.id);
    return success({ deleted: true });
  },
});
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// ✅ Good - Use rate limiting
const sensitiveOperation = t.mutation({
  args: z.object({ /* ... */ }),
  handler: async (ctx, args) => {
    // Check rate limit
    const canProceed = await ctx.rateLimit.check(ctx.userId, 'operation', 10, 60000);
    if (!canProceed) {
      return failureOutcome(
        cause({ name: 'RateLimitExceeded', message: 'Too many requests' })
      );
    }

    // Perform operation
    return success(await performOperation(args));
  },
});
```

## Dependency Security

We regularly update dependencies to address security vulnerabilities:

- **Automated scans:** Dependabot automatically scans for vulnerabilities
- **Regular audits:** Manual security audits before major releases
- **Prompt updates:** Security patches are prioritized

To keep your project secure:

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Fix vulnerabilities automatically
pnpm audit fix
```

## Security Features in DeesseJS Functions

### Built-in Protections

1. **Type Safety with Zod:** Runtime type validation prevents injection attacks
2. **Context Isolation:** Context is defined once and cannot be modified at runtime
3. **Outcome Types:** Structured error handling prevents information leakage
4. **Lifecycle Hooks:** Middleware pattern for security checks

### Example: Security Middleware

```typescript
import { defineContext } from '@deessejs/functions';

const { t, createAPI } = defineContext<{
  userId: string;
  permissions: string[];
}>({
  userId: getUserFromSession(),
  permissions: getUserPermissions(),
});

// Apply security checks to all mutations
const securedMutation = (mutation) =>
  mutation.beforeInvoke((ctx) => {
    // Log all mutations
    ctx.logger.info('Mutation invoked', { userId: ctx.userId });

    // Check if user is verified
    if (!ctx.permissions.includes('verified')) {
      throw new Error('User not verified');
    }
  });
```

## Disclosure Policy

### Vulnerability Disclosure Process

1. **Report Received:** Security team acknowledges the report
2. **Investigation:** Team validates and assesses the vulnerability
3. **Development:** Security fix is developed and tested
4. **Release:** Security update is released
5. **Disclosure:** Public disclosure with credit to reporter

### Credit

Security researchers who follow this policy will be credited in the security advisory (unless they prefer to remain anonymous).

### Security Advisories

Security advisories will be published on GitHub with:
- CVE identifier (if applicable)
- Severity rating (CVSS)
- Affected versions
- Fixed versions
- Mitigation steps
- Credit to reporter

## Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security/getting-started/github-security-features)
- [OWASP TypeScript Security](https://owasp.org/www-project-typescript/)
- [Node.js Security Best Practices](https://github.com/lirantal/nodejs-security-best-practices)

## Contact

For security-related questions that are not vulnerability reports:
- **Email:** [contact@developerssecrets.com](mailto:contact@developerssecrets.com)
- **PGP Key:** Available on request

---

Thank you for helping keep DeesseJS Functions secure! 🔒
