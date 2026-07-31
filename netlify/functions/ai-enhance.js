/* ==========================================================================
   ai-enhance.js — POST { product } → AI-generated SEO title, descriptions,
   benefits, pros/cons, FAQ, keywords, and a suggested category.

   Admin only. Calls api.anthropic.com server-side using ANTHROPIC_API_KEY
   (set in Netlify env vars). The key never reaches the browser. Requires
   that env var to be set — if it's missing, this returns a clear error
   instead of silently failing.
   ========================================================================== */

const { requireAuth, jsonResponse } = require('../lib/auth');
const store = require('../lib/store');

const SYSTEM_PROMPT = `You are a copywriter for an affiliate shopping site called BrowseWise.
Given raw scraped/entered product data, write ORIGINAL marketing copy — never copy the
input description verbatim, and never fabricate specs, certifications, or claims that
aren't implied by the input. If information is missing, write generically rather than
inventing facts (e.g. don't invent a battery life if none was given).

Respond with ONLY a JSON object (no markdown fences, no preamble) matching this shape:
{
  "seoTitle": string (under 60 chars, includes the core product type),
  "seoDescription": string (under 155 chars),
  "shortDescription": string (1 sentence, under 20 words),
  "description": string (2-4 original sentences, no marketing cliches like "game-changer"),
  "features": string[] (3-6 short bullet points, only from given info),
  "pros": string[] (2-4 items),
  "cons": string[] (1-3 honest, plausible items — don't invent defects, but note things like "no info on X"),
  "faq": [{"q": string, "a": string}] (2-3 realistic buyer questions),
  "keywords": string[] (5-10 search terms),
  "suggestedCategory": string (one of: Electronics, Kitchen, Home, Fitness, Gaming, Fashion, Beauty, Pets, Travel, Gifts)
}`;

exports.handler = async (event) => {
  if (!requireAuth(event)) return jsonResponse(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error: 'AI enhancement is not configured. Set ANTHROPIC_API_KEY in Netlify environment variables.',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid request body' });
  }

  const { product } = body;
  if (!product || !product.title) {
    return jsonResponse(400, { error: 'A product with at least a title is required' });
  }

  const categories = await store.listCategories();

  const userPrompt = `Raw product data:
Title: ${product.title}
Brand: ${product.brand || '(unknown)'}
Category guess: ${product.category || '(unknown)'}
Price: ${product.price || '(unknown)'}
Retailer description (for reference only — do not copy): ${product.description || '(none provided)'}
Available categories: ${categories.join(', ')}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText);
      return jsonResponse(502, { error: `AI request failed (${res.status})` });
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) return jsonResponse(502, { error: 'AI returned no text content' });

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    let enhancement;
    try {
      enhancement = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI JSON:', cleaned);
      return jsonResponse(502, { error: 'AI response was not valid JSON' });
    }

    return jsonResponse(200, { enhancement });
  } catch (err) {
    console.error('ai-enhance error:', err);
    return jsonResponse(500, { error: err.message || 'Internal error' });
  }
};
