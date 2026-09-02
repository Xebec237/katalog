import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL doit commencer par postgres:// ou postgresql://')
    .default('postgresql://postgres.gkxwbnnehqyehivtltva:ex-N-EXvm7L%2BZN%26@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'),
  REDIS_URL: z.string()
    .regex(/^rediss?:\/\//, 'REDIS_URL doit commencer par redis:// ou rediss://')
    .default('rediss://default:gQAAAAAAAbZVAAIgcDI3YTcyN2RhODE2ZDc0MDBjOTkwOGY4YzZjMWI2N2RlMw@apt-jackal-112213.upstash.io:6379'),
  JWT_SECRET: z.string()
    .min(16, 'JWT_SECRET doit contenir au moins 16 caractères')
    .default('f3a8c9e2d17b4560f8e9a2c3d4b5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  FRONTEND_URL: z.string().url().optional(),
}).passthrough();

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    if (config.NODE_ENV === 'production') {
      console.error('❌ Variables d\'environnement invalides:', JSON.stringify(parsed.error.format(), null, 2));
      throw new Error('Variables d\'environnement invalides. Vérifiez la configuration (ex: Vercel).');
    }
    console.warn('⚠️ Variables d\'environnement invalides (Mode local). Utilisation de la configuration brute pour ne pas crasher...', parsed.error.format());
    return config as EnvConfig;
  }
  return parsed.data;
}
