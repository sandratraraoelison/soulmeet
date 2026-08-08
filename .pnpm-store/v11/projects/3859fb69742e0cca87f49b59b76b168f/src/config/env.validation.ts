import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  CORS_ORIGIN: Joi.string().required(),
  GOOGLE_CLIENT_IDS: Joi.string().allow('').default(''),
  APPLE_CLIENT_IDS: Joi.string().allow('').default(''),
  LLM_PROVIDER: Joi.string().valid('ollama', 'deepseek', 'openai', 'openai-compatible').default('ollama'),
  LLM_BASE_URL: Joi.string().uri().default('http://localhost:11434'),
  LLM_MODEL: Joi.string().min(1).default('llama3.1:8b'),
  LLM_API_KEY: Joi.when('LLM_PROVIDER', {
    is: 'ollama', then: Joi.string().allow('').default(''), otherwise: Joi.string().required(),
  }),
  LLM_TIMEOUT_MS: Joi.number().integer().min(1000).max(300000).default(60000),
  SOULPRINT_EXTRACTION_ENABLED: Joi.boolean().default(true),
  SOULPRINT_EXTRACTION_MIN_USER_MESSAGES: Joi.number().integer().min(1).default(3),
  SOULPRINT_EXTRACTION_MIN_CHARACTERS: Joi.number().integer().min(1).default(300),
  SOULPRINT_EXTRACTION_DEBOUNCE_SECONDS: Joi.number().integer().min(0).default(30),
  SOULPRINT_EXTRACTION_MAX_MESSAGES: Joi.number().integer().min(1).max(100).default(20),
  SOULPRINT_EXTRACTION_TIMEOUT_MS: Joi.number().integer().min(1000).default(120000),
  SOULPRINT_AUTO_CONFIRM_DIRECT_FACTS: Joi.boolean().default(true),
  SOULPRINT_AUTO_SUMMARY_ENABLED: Joi.boolean().default(true),
  SOULPRINT_SUMMARY_CHANGE_THRESHOLD: Joi.number().integer().min(1).default(3),
  SOULPRINT_MAX_GUIDANCE_ENTRIES: Joi.number().integer().min(1).max(100).default(25),
  SOULPRINT_HISTORY_ENABLED: Joi.boolean().default(true),
  SOULPRINT_PROMPT_VERSION: Joi.string().default('v1'),
});
