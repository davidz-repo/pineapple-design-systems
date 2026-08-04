import { definePineappleVitest } from '@pineappleui/vitest-preset';

export default definePineappleVitest({
  test: { include: ['src/**/*.test.{ts,tsx}'] },
});
