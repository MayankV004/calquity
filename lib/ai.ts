import { createOpenAI } from '@ai-sdk/openai';

export function getAIModel(fallbackIndex: number = 0) {
  const hfToken = process.env.HF_TOKEN;
  const openAiKey = process.env.OPENAI_API_KEY;

  const hfModels = [
    {
      modelId: 'nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16',
      name: 'Hugging Face (NVIDIA Nemotron 3 Ultra)',
    },
    {
      modelId: 'meta-llama/Llama-3.3-70B-Instruct',
      name: 'Hugging Face (Llama 3.3 70B Instruct)',
    },
    {
      modelId: 'Qwen/Qwen2.5-Coder-32B-Instruct',
      name: 'Hugging Face (Qwen 2.5 Coder 32B)',
    },
  ];

  if (hfToken) {
    const huggingface = createOpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: hfToken,
    });

    const selected = hfModels[Math.min(fallbackIndex, hfModels.length - 1)];
    return {
      model: huggingface(selected.modelId),
      provider: selected.name,
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
