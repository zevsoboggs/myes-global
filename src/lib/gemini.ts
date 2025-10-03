export type GenerateDescriptionInput = {
  title?: string;
  address?: string;
  property_type?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  area_sqm?: string | number;
  features?: string[];
};

const MODEL = 'gemini-1.5-pro'; // стабильная модель

export async function generatePropertyDescription(input: GenerateDescriptionInput): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Не задан ключ VITE_GEMINI_API_KEY');

  const parts: string[] = [];
  parts.push('Составь красивое, убедительное и правдивое описание объекта недвижимости на русском языке (не более 800 символов).');
  if (input.title) parts.push(`Название: ${input.title}`);
  if (input.address) parts.push(`Адрес: ${input.address}`);
  if (input.property_type) parts.push(`Тип: ${input.property_type}`);
  if (input.bedrooms !== undefined && input.bedrooms !== '') parts.push(`Спальни: ${input.bedrooms}`);
  if (input.bathrooms !== undefined && input.bathrooms !== '') parts.push(`Ванные: ${input.bathrooms}`);
  if (input.area_sqm !== undefined && input.area_sqm !== '') parts.push(`Площадь: ${input.area_sqm} м²`);
  if (input.features && input.features.length > 0) parts.push(`Особенности: ${input.features.join(', ')}`);
  parts.push('Избегай лишнего маркетинга, выдели ключевые преимущества, делай текст читабельным и структурированным.');

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: parts.join('\n') }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
    },
  } as const;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`AI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Пустой ответ AI');
  return text;
} 