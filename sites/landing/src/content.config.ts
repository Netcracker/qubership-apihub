import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const releases = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/releases' }),
  schema: z.object({
    version: z.string(),
    date: z.string(),
    latest: z.boolean().default(false),
    highlights: z.array(z.string()),
  }),
});

const useCases = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/use-cases' }),
  schema: z.object({
    persona: z.string(),
    icon: z.string(),
    title: z.string(),
    steps: z.array(z.string()),
    value: z.string(),
    color: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { releases, 'use-cases': useCases };
