import { corsHeaders } from './_shared';

const MAX_TEXT_LENGTH = 500;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AI) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }

  try {
    const body = await request.json();
    const text = (body.text || '').trim();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const truncated = text.length > MAX_TEXT_LENGTH
      ? text.substring(0, MAX_TEXT_LENGTH)
      : text;

    const response = await env.AI.run(
      '@cf/myshell-ai/melotts',
      { prompt: truncated, lang: 'zh' }
    );

    if (!response || response.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    return new Response(response, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': response.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        ...corsHeaders()
      }
    });
  } catch (e) {
    console.error('TTS API error:', e);
    return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
