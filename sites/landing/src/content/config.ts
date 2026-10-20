import { defineCollection, z } from 'astro:content';

const releases = defineCollection({
  type: 'content',
  schema: z.object({
    version: z.string(),
    date: z.string(),
    latest: z.boolean().default(false),
    highlights: z.array(z.string()),
  }),
});

const features = defineCollection({
  type: 'content',
  schema: z.object({
    tab: z.string(),
    title: z.string(),
    description: z.string(),
    bullets: z.array(z.string()),
    image: z.string().optional(),
    alt: z.string().optional(),
    order: z.number().default(0),
  }),
});

const useCases = defineCollection({
  type: 'content',
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

export const collections = { releases, features, 'use-cases': useCases };
