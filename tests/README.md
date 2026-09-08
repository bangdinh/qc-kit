# Where a test goes

| Folder        | Contains                                                                 |
|---------------|--------------------------------------------------------------------------|
| `tests/setup` | Setup projects (authentication, seed data). Files end in `.setup.ts`.     |
| `tests/ui`    | Single-page / single-feature UI checks. Fast, authenticated by default.   |
| `tests/e2e`   | Multi-page business journeys that cross features.                        |
| `tests/api`   | Pure API checks — no browser started.                                    |

Every spec imports the shared fixtures, not `@playwright/test` directly:

```ts
import { test, expect } from '../../src/fixtures';

test('example', async ({ createPage, testData }) => {
  // ...
});
```
