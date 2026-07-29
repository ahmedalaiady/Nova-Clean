// GET /tables/orders?page=&limit=   -> paginated list
// POST /tables/orders                -> create a new order

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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const totalRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM orders').first();
    const total = totalRow ? totalRow.cnt : 0;

    const { results } = await env.DB.prepare(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    return jsonResponse({
      data: results || [],
      total,
      page,
      limit,
      table: 'orders'
    });
  } catch (err) {
    return jsonResponse({ error: 'Failed to fetch orders', details: String(err) }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const {
    full_name = '',
    phone = '',
    governorate = '',
    address = '',
    offer_selected = '',
    price = '',
    status = 'جديد'
  } = body || {};

  if (!full_name || !phone) {
    return jsonResponse({ error: 'full_name and phone are required' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO orders (id, full_name, phone, governorate, address, offer_selected, price, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, full_name, phone, governorate, address, offer_selected, price, status, now, now).run();

    const created = {
      id,
      full_name,
      phone,
      governorate,
      address,
      offer_selected,
      price,
      status,
      created_at: now,
      updated_at: now
    };

    return jsonResponse(created, 201);
  } catch (err) {
    return jsonResponse({ error: 'Failed to create order', details: String(err) }, 500);
  }
}
