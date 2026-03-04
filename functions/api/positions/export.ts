interface Env {
  POSITIONS: KVNamespace;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * GET /api/positions/export
 * 
 * Returns all position data as a single JSON object for backup purposes.
 * Response shape: { exported_at, entries: { [page]: { data, updated_at } } }
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // List all keys with the positions: prefix
    const list = await context.env.POSITIONS.list({ prefix: 'positions:' });
    
    const entries: Record<string, { data: unknown; updated_at: string | null }> = {};
    
    for (const key of list.keys) {
      const result = await context.env.POSITIONS.getWithMetadata<{ updated_at: string }>(key.name);
      const page = key.name.replace('positions:', '');
      entries[page] = {
        data: result.value ? JSON.parse(result.value) : {},
        updated_at: result.metadata?.updated_at ?? null,
      };
    }
    
    return new Response(JSON.stringify({
      exported_at: new Date().toISOString(),
      total_pages: Object.keys(entries).length,
      entries,
    }, null, 2), { headers: JSON_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to export positions' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
