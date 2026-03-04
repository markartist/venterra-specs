interface Env {
  POSITIONS: KVNamespace;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const page = context.params.page as string;
  const url = new URL(context.request.url);
  const withMeta = url.searchParams.get('meta') === 'true';
  
  try {
    const result = await context.env.POSITIONS.getWithMetadata<{ updated_at: string }>(`positions:${page}`);
    
    if (!result.value) {
      return new Response(JSON.stringify(withMeta ? { data: {}, updated_at: null } : {}), {
        headers: JSON_HEADERS
      });
    }
    
    if (withMeta) {
      return new Response(JSON.stringify({
        data: JSON.parse(result.value),
        updated_at: result.metadata?.updated_at ?? null,
        page,
      }), { headers: JSON_HEADERS });
    }
    
    return new Response(result.value, { headers: JSON_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch positions' }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const page = context.params.page as string;
  
  try {
    const body = await context.request.json() as Record<string, any>;
    const now = new Date().toISOString();
    
    await context.env.POSITIONS.put(
      `positions:${page}`,
      JSON.stringify(body),
      { metadata: { updated_at: now } }
    );
    
    return new Response(JSON.stringify({ success: true, updated_at: now }), {
      headers: JSON_HEADERS
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save positions' }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
};
