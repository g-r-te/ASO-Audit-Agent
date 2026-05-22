import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * Resolves the chat model at request time (so Next.js has loaded .env).
 * Mastra's string router (`openai/gpt-4o-mini`) fails when OPENAI_API_KEY is
 * missing or OPENAI_MODEL lacks a provider prefix — this uses AI SDK directly.
 */
export function getAgentModel(): LanguageModel {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Copy .env.example to .env and add your API key.',
    );
  }

  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
  });

  const raw = (process.env.OPENAI_MODEL ?? 'gpt-4o-mini').trim();
  // Accept "openai/gpt-4o-mini" or "gpt-4o-mini"
  const modelId = raw.includes('/') ? raw.split('/').slice(1).join('/') : raw;

  if (!modelId) {
    throw new Error('OPENAI_MODEL is empty. Set it in .env (e.g. gpt-4o-mini).');
  }

  return openai(modelId);
}
