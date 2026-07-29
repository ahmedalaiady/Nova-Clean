// GET /tables/orders/:id  -> fetch a single order
// PUT /tables/orders/:id  -> update an existing order

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  try {
    const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!row) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }
    return jsonResponse(row);
  } catch (err) {
    return jsonResponse({ error: 'Failed to fetch order', details: String(err) }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const existing = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!existing) {
    return jsonResponse({ error: 'Order not found' }, 404);
  }

  const merged = {
    full_name: body.full_name ?? existing.full_name,
    phone: body.phone ?? existing.phone,
    governorate: body.governorate ?? existing.governorate,
    address: body.address ?? existing.address,
    offer_selected: body.offer_selected ?? existing.offer_selected,
    price: body.price ?? existing.price,
    status: body.status ?? existing.status
  };
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      `UPDATE orders SET full_name = ?, phone = ?, governorate = ?, address = ?, offer_selected = ?, price = ?, status = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      merged.full_name, merged.phone, merged.governorate, merged.address,
      merged.offer_selected, merged.price, merged.status, now, id
    ).run();

    return jsonResponse({ id, ...merged, created_at: existing.created_at, updated_at: now });
  } catch (err) {
    return jsonResponse({ error: 'Failed to update order', details: String(err) }, 500);
  }
}
