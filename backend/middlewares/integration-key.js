'use strict'

const CIERRE_API_KEY = process.env.CIERRE_API_KEY || 'cierre_diario_seguro_2026';

exports.ensureCierreApiKey = (req, res, next) => {
	const fromHeader = String(req.headers['x-api-key'] || '').trim();
	const fromQuery = String(req.query?.apiKey || '').trim();
	const fromBody = String(req.body?.apiKey || '').trim();

	const providedKey = fromHeader || fromQuery || fromBody;
	if (!providedKey) {
		return res.status(401).send({ message: 'API key requerida para upsertCierreDiario' });
	}

	if (providedKey !== CIERRE_API_KEY) {
		return res.status(401).send({ message: 'API key invalida' });
	}

	next();
};
