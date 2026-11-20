import { describe, it, expect, vi } from 'vitest';
import { graphql } from 'graphql';
import { createSchema } from 'graphql-yoga';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

const schema = createSchema({ typeDefs, resolvers });
describe('CMS via GraphQL', () => {
  it('nekar anonyma och medlemmar innan preview anropas', async () => {
    const previewNotices = vi.fn();
    for (const user of [null, { role: 'member' }]) {
      const result = await graphql({
        schema, source: '{ notices(preview: true) { title } }',
        contextValue: { user, cms: { previewNotices } },
      });
      expect(result.errors[0].extensions.code).toBe('FORBIDDEN');
    }
    expect(previewNotices).not.toHaveBeenCalled();
  });
  it('låter redaktören läsa utkast och kopplar publicerade notiser till rätt slug', async () => {
    const notices = vi.fn(async () => [
      { id: '1', title: 'Bron', guideSlug: 'leden-1' },
      { id: '2', title: 'Annan led', guideSlug: 'leden-2' },
    ]);
    const previewNotices = vi.fn(async () => [{ title: 'Utkast' }]);
    const result = await graphql({
      schema,
      source: '{ notices(preview: true) { title } guide(slug: "leden-1") { notices { title } } }',
      contextValue: {
        user: { role: 'editor' }, cms: { notices, previewNotices },
        query: async () => ({ rows: [{ slug: 'leden-1' }] }),
      },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data.notices).toEqual([{ title: 'Utkast' }]);
    expect(result.data.guide.notices).toEqual([{ title: 'Bron' }]);
  });
});
