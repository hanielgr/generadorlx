const { MercadoPagoConfig, Preference } = require('mercadopago');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { docId, price, title, currentPath } = JSON.parse(event.body || '{}');

    if (!docId || !price || !title || !currentPath) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan datos (docId, price, title, currentPath)' }) };
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Falta configurar MP_ACCESS_TOKEN en Netlify' }) };
    }

    const origin = event.headers.origin || `https://${event.headers.host}`;

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: docId,
            title: title,
            quantity: 1,
            currency_id: 'MXN',
            unit_price: Number(price),
          },
        ],
        back_urls: {
          success: `${origin}${currentPath}?paid=1&doc=${docId}`,
          failure: `${origin}${currentPath}`,
          pending: `${origin}${currentPath}`,
        },
        auto_return: 'approved',
        statement_descriptor: 'GENERADOR LEGAL',
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ init_point: result.init_point }),
    };
  } catch (err) {
    console.error('Error creando preferencia de Mercado Pago:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'No se pudo crear la preferencia de pago' }),
    };
  }
};
