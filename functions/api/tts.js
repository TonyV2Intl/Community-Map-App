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

    const result = await env.AI.run(
      '@cf/myshell-ai/melotts',
      { prompt: truncated, lang: 'zh' }
    );

    // Workers AI TTS 模型返回的可能是 Response 对象或 ArrayBuffer
    let audioBuffer;
    if (result instanceof Response) {
      audioBuffer = await result.arrayBuffer();
    } else if (result instanceof ArrayBuffer) {
      audioBuffer = result;
    } else if (result && result.byteLength !== undefined) {
      audioBuffer = result;
    } else {
      return new Response(JSON.stringify({ error: 'Unexpected AI response type' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        ...corsHeaders()
      }
    });
  } catch (e) {
    console.error('TTS API error:', e);
    return new Response(JSON.stringify({ error: 'TTS generation failed', detail: e.message }), {
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
