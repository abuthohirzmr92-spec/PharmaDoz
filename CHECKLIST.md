# Pre-Deployment Checklist

- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] ESLint passes (`npx eslint src/ --ext .ts,.tsx`)
- [ ] Next.js build succeeds (`npx next build`)
- [ ] All tests pass (`npx vitest run`)
- [ ] `.env.local` has real values (if going live) OR placeholder values (demo mode)
- [ ] `.gitignore` blocks `.env*`, `.vercel`, `node_modules`, `.next`
- [ ] CSP headers configured in `next.config.ts`
- [ ] Middleware whitelist includes `/offline` and `/unauthorized`
- [ ] Error boundaries tested
- [ ] Loading states verified on all major pages
