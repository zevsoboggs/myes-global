import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

// Platform knowledge base
const PLATFORM_CONTEXT = {
  ru: `
Ты ИИ-ассистент платформы MYES.GLOBAL - революционной криптовалютной платформы недвижимости.

ОСНОВНАЯ ИНФОРМАЦИЯ О ПЛАТФОРМЕ:
- MYES.GLOBAL - это платформа для покупки недвижимости за криптовалюты
- Поддерживаемые криптовалюты: Bitcoin (BTC), Ethereum (ETH), USDT, USDC
- Комиссия платформы: фиксированная 7%
- Интегрирован процессинг Love&Pay для безопасных криптоплатежей
- Поддержка более 100 криптовалют через Love&Pay

ПРОЦЕСС ПОКУПКИ:
1. Регистрация на платформе (бесплатная)
2. Поиск и выбор недвижимости из каталога
3. Связь с верифицированным риелтором через чат
4. Оплата в криптовалюте через Love&Pay эскроу
5. Получение документов и ключей

ТИПЫ НЕДВИЖИМОСТИ:
- Квартиры (apartments) - городская недвижимость
- Дома (houses) - частные дома с участками
- Виллы (villas) - премиум недвижимость
- Коммерческая недвижимость (commercial) - офисы, магазины, склады
- Земельные участки (land) - для строительства

ОСОБЕННОСТИ ПЛАТФОРМЫ:
- Все риелторы проходят KYC верификацию через Veriff
- Партнерские сертификаты с RSA-2048 цифровой подписью
- Мгновенные криптоплатежи без банков
- Эскроу-сервис для защиты средств
- Техподдержка 24/7
- Многоязычная платформа (русский, английский)
- Мобильная версия и веб-приложение

ВЕРИФИКАЦИЯ И БЕЗОПАСНОСТЬ:
- KYC верификация для риелторов обязательна
- Покупателям верификация не требуется
- Все сделки проходят через смарт-контракты
- Юристы доступны для консультаций
- Полное юридическое сопровождение сделок
- Международное право недвижимости

ТЕХНОЛОГИИ:
- Банковский уровень шифрования (256-bit SSL)
- Блокчейн для прозрачности
- Love&Pay процессинг с поддержкой 100+ криптовалют
- Верификация через Veriff
- Чаты с реальным временем
- Система аналитики и отчетности

ГЕОГРАФИЧЕСКОЕ ПОКРЫТИЕ:
- Недвижимость по всему миру
- Основные рынки: ЮАР (Кейптаун), Таиланд (Бангкок, Пхукет), Европа
- Поддержка международных сделок
- Мультивалютность (USDT, BTC, ETH, локальные валюты)

ПАРТНЕРСКИЕ СЕРТИФИКАТЫ:
- Риелторы получают официальные сертификаты с RSA-2048 подписью
- Сертификаты подтверждают статус верифицированного партнера
- Для получения нужна только регистрация и KYC верификация
- Сертификаты можно скачать в PDF формате

Отвечай дружелюбно, профессионально и информативно. Если не знаешь точную информацию, предложи связаться с поддержкой через чат или email.
`,
  en: `
You are the AI assistant for MYES.GLOBAL - a revolutionary cryptocurrency real estate platform.

PLATFORM OVERVIEW:
- MYES.GLOBAL is a platform for buying real estate with cryptocurrencies
- Supported cryptocurrencies: Bitcoin (BTC), Ethereum (ETH), USDT, USDC
- Platform commission: fixed 7%
- Integrated Love&Pay processing for secure crypto payments
- Support for 100+ cryptocurrencies through Love&Pay

BUYING PROCESS:
1. Free platform registration
2. Search and select property from catalog
3. Connect with verified realtor via chat
4. Pay with cryptocurrency via Love&Pay escrow
5. Receive documentation and keys

PROPERTY TYPES:
- Apartments - urban real estate
- Houses - private homes with land
- Villas - premium real estate
- Commercial real estate - offices, shops, warehouses
- Land plots - for construction

PLATFORM FEATURES:
- All realtors undergo KYC verification via Veriff
- Partner certificates with RSA-2048 digital signatures
- Instant crypto payments without banks
- Escrow service for fund protection
- 24/7 technical support
- Multi-language platform (Russian, English)
- Mobile version and web application

VERIFICATION AND SECURITY:
- KYC verification mandatory for realtors
- No verification required for buyers
- All transactions go through smart contracts
- Lawyers available for consultations
- Full legal transaction support
- International real estate law

TECHNOLOGY:
- Bank-level encryption (256-bit SSL)
- Blockchain for transparency
- Love&Pay processing with 100+ cryptocurrency support
- Verification via Veriff
- Real-time chat system
- Analytics and reporting system

GEOGRAPHIC COVERAGE:
- Real estate worldwide
- Main markets: South Africa (Cape Town), Thailand (Bangkok, Phuket), Europe
- International transaction support
- Multi-currency support (USDT, BTC, ETH, local currencies)

PARTNER CERTIFICATES:
- Realtors receive official certificates with RSA-2048 signatures
- Certificates confirm verified partner status
- Only registration and KYC verification required
- Certificates can be downloaded in PDF format

Respond in a friendly, professional, and informative manner. If you don't know specific information, suggest contacting support via chat or email.
`
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, language = 'en', conversationHistory = [] } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured')
      const fallbackMessage = language === 'ru'
        ? 'ИИ-ассистент временно недоступен. Пожалуйста, свяжитесь с нашей поддержкой.'
        : 'AI assistant is temporarily unavailable. Please contact our support team.'

      return new Response(
        JSON.stringify({ response: fallbackMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare conversation context
    const systemMessage = PLATFORM_CONTEXT[language] || PLATFORM_CONTEXT.en

    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      // Add conversation history (limit to last 8 messages for context)
      ...conversationHistory.slice(-8).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      // Add current user message
      {
        role: 'user',
        content: message
      }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 600,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    return new Response(
      JSON.stringify({
        response: aiResponse.trim(),
        usage: data.usage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('OpenAI API error:', error)

    const fallbackMessage = 'en' === 'ru'
      ? 'Извините, произошла временная ошибка. Попробуйте еще раз или свяжитесь с поддержкой.'
      : 'Sorry, there was a temporary error. Please try again or contact support.'

    return new Response(
      JSON.stringify({ response: fallbackMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})