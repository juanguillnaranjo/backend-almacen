const https = require('https');

const url = process.env.URL_CREDITOS_ABONOS_DIA || 'https://almacenv2.appiorange.com/envioAbonosCrditosClientes.php';

function parseJsonRaicesConcatenadas(texto) {
  const raices = [];
  let i = 0;
  const len = texto.length;

  while (i < len) {
    while (i < len && /\s/.test(texto[i])) i += 1;
    if (i >= len) break;

    const inicio = texto[i];
    if (inicio !== '{' && inicio !== '[') {
      i += 1;
      continue;
    }

    let profundidad = 0;
    let enString = false;
    let escapado = false;
    let j = i;

    for (; j < len; j += 1) {
      const ch = texto[j];

      if (enString) {
        if (escapado) escapado = false;
        else if (ch === '\\') escapado = true;
        else if (ch === '"') enString = false;
        continue;
      }

      if (ch === '"') {
        enString = true;
        continue;
      }

      if (ch === '{' || ch === '[') profundidad += 1;
      if (ch === '}' || ch === ']') profundidad -= 1;

      if (profundidad === 0) {
        raices.push(texto.slice(i, j + 1));
        i = j + 1;
        break;
      }
    }

    if (j >= len) break;
  }

  return raices;
}

https.get(url, (response) => {
  let body = '';
  response.setEncoding('utf8');
  response.on('data', (chunk) => { body += chunk; });
  response.on('end', () => {
    console.log('status:', response.statusCode);
    console.log('len:', body.length);
    console.log('head:', body.slice(0, 300));

    const limpio = String(body || '').trim();
    try {
      const unico = JSON.parse(limpio);
      if (unico && typeof unico === 'object' && !Array.isArray(unico)) {
        console.log('top keys:', Object.keys(unico));
        const dev = Array.isArray(unico.devoluciones)
          ? unico.devoluciones
          : Array.isArray(unico.datosDevoluciones)
            ? unico.datosDevoluciones
            : Array.isArray(unico.datosDevolciones)
              ? unico.datosDevolciones
              : [];
        console.log('devoluciones len:', dev.length);
        console.log('devoluciones keys:', dev[0] ? Object.keys(dev[0]) : []);
        return;
      }
    } catch (e) {
      // Ignorar, continuar con estrategia de bloques concatenados.
    }

    const bloques = parseJsonRaicesConcatenadas(limpio);
    const arreglos = bloques
      .map((bloque) => {
        try {
          return JSON.parse(bloque);
        } catch (e) {
          return null;
        }
      })
      .filter((v) => Array.isArray(v));

    console.log('arrays:', arreglos.length);
    arreglos.forEach((arr, idx) => {
      const first = arr[0] || {};
      console.log('idx:', idx, 'len:', arr.length, 'keys:', Object.keys(first));
    });
  });
}).on('error', (err) => {
  console.error('net_err:', err.message);
});
