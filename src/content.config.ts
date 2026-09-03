import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const sharedLegacySchema = {
  lang: z.string().default('zh'),
  legacy: z.boolean().default(true),
  legacyPath: z.string(),
  sourceFile: z.string(),
};

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    slug: z.string(),
    canonicalUrl: z.url().optional(),
    ...sharedLegacySchema,
  }),
});

const daily = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/daily' }),
  schema: z
    .object({
      date: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      itemCount: z.number().int().nonnegative(),
      sourceOrderStart: z.number().int().positive(),
      sourceOrderEnd: z.number().int().positive(),
      dateResolution: z.enum(['exact', 'range']).default('exact'),
      legacyDateLabel: z.coerce.string().optional(),
      dateCandidates: z.array(z.coerce.string()).optional(),
      ...sharedLegacySchema,
    })
    .superRefine((data, context) => {
      if (data.dateResolution === 'range' && !data.endDate) {
        context.addIssue({ code: 'custom', path: ['endDate'], message: 'A date range requires endDate.' });
      }
      if (data.dateResolution === 'exact' && data.endDate) {
        context.addIssue({ code: 'custom', path: ['endDate'], message: 'An exact date must not define endDate.' });
      }
      if (data.endDate && data.endDate <= data.date) {
        context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be after date.' });
      }
    }),
});

export const collections = { writing, daily };
