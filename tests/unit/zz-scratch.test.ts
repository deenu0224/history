import { validateContent } from '@/core/validate';
import { content, modules } from '@/data';
it('scratch', () => {
  const r = validateContent(content, { historical: modules.historical });
  console.log(JSON.stringify([...r.errors, ...r.warnings], null, 1));
});
