import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// src/content/docs/ is written by scripts/sync-docs.mjs from docs/; it is not edited by hand.
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
