import { createOpenAI } from '@ai-sdk/openai';

export function getAIModel() {
  const hfToken = process.env.HF_TOKEN;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (hfToken) {
    const huggingface = createOpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: hfToken,
    });
    // NVIDIA Nemotron 3 Ultra on Hugging Face
    return {
      model: huggingface('nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16'),
      provider: 'Hugging Face (NVIDIA Nemotron 3 Ultra)',
    };
  }

  if (openAiKey) {
    const openai = createOpenAI({ apiKey: openAiKey });
    return {
      model: openai('gpt-4o'),
      provider: 'OpenAI (GPT-4o)',
    };
  }

  return {
    model: null,
    provider: 'Local Deterministic RAG Fallback',
  };
}
