'use strict'

var jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_proyecto_almacen_2026';

exports.ensureAuth = (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || '';
		if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
			return res.status(401).send({ message: 'Token no proporcionado' });
		}

		const token = authHeader.slice(7).trim();
		if (!token) {
			return res.status(401).send({ message: 'Token no proporcionado' });
		}

		const payload = jwt.verify(token, JWT_SECRET);
		req.user = payload;
		next();
	} catch (err) {
		return res.status(401).send({ message: 'Token invalido o expirado' });
	}
};
