import { createOpenAI } from '@ai-sdk/openai';

export function getAIModel(fallbackIndex: number = 0) {
  const hfToken = process.env.HF_TOKEN;
  const openAiKey = process.env.OPENAI_API_KEY;

  // prefer openai if key exists for fast TTFT
  if (openAiKey) {
    const openai = createOpenAI({ apiKey: openAiKey });
    return {
      model: openai('gpt-4o-mini'),
      provider: 'OpenAI Gateway (gpt-4o-mini)',
    };
  }

  const hfModels = [
    {
      modelId: 'meta-llama/Llama-3.1-8B-Instruct',
      name: 'Hugging Face (Llama 3.1 8B Instruct)',
    },
    {
      modelId: 'Qwen/Qwen2.5-7B-Instruct',
      name: 'Hugging Face (Qwen 2.5 7B Instruct)',
    },
    {
      modelId: 'meta-llama/Llama-3.3-70B-Instruct',
      name: 'Hugging Face (Llama 3.3 70B Instruct)',
    },
  ];

  if (hfToken) {
    const huggingface = createOpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: hfToken,
    });

    // clamp index if fallback depth exceeds available models
    const selected = hfModels[Math.min(fallbackIndex, hfModels.length - 1)];
    return {
      model: huggingface(selected.modelId),
      provider: selected.name,
    };
  }

  return {
    model: null,
    provider: 'Local Deterministic RAG Fallback',
  };
}
