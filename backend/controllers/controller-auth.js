'use strict'

var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var User = require('../modules/module-user');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_proyecto_almacen_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

function sanitizeUser(user) {
	return {
		_id: user._id,
		name: user.name,
		email: user.email,
		role: user.role,
		active: user.active
	};
}

function signToken(user) {
	return jwt.sign(
		{
			sub: String(user._id),
			email: user.email,
			name: user.name,
			role: user.role
		},
		JWT_SECRET,
		{ expiresIn: JWT_EXPIRES }
	);
}

var controller = {
	register: async (req, res) => {
		try {
			const name = String(req.body?.name || '').trim();
			const email = String(req.body?.email || '').trim().toLowerCase();
			const password = String(req.body?.password || '');
			const role = String(req.body?.role || 'admin').trim().toLowerCase();

			if (!email || !password) {
				return res.status(400).send({ message: 'Email y password son obligatorios' });
			}

			if (password.length < 6) {
				return res.status(400).send({ message: 'La contraseña debe tener al menos 6 caracteres' });
			}

			const exists = await User.findOne({ email });
			if (exists) {
				return res.status(409).send({ message: 'Ya existe un usuario con este email' });
			}

			const hashed = await bcrypt.hash(password, 10);
			const user = new User({
				name: name || email,
				email,
				password: hashed,
				role: role === 'user' ? 'user' : 'admin'
			});

			const stored = await user.save();
			return res.status(201).send({ user: sanitizeUser(stored) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al registrar usuario', error: err });
		}
	},

	login: async (req, res) => {
		try {
			const email = String(req.body?.email || '').trim().toLowerCase();
			const password = String(req.body?.password || '');

			if (!email || !password) {
				return res.status(400).send({ message: 'Email y password son obligatorios' });
			}

			const user = await User.findOne({ email });
			if (!user || !user.active) {
				return res.status(401).send({ message: 'Credenciales invalidas' });
			}

			const valid = await bcrypt.compare(password, user.password);
			if (!valid) {
				return res.status(401).send({ message: 'Credenciales invalidas' });
			}

			const token = signToken(user);
			return res.status(200).send({ token, user: sanitizeUser(user) });
		} catch (err) {
			return res.status(500).send({ message: 'Error en login', error: err });
		}
	},

	me: async (req, res) => {
		try {
			const userId = String(req.user?.sub || '');
			if (!userId) return res.status(401).send({ message: 'No autorizado' });

			const user = await User.findById(userId);
			if (!user || !user.active) {
				return res.status(401).send({ message: 'No autorizado' });
			}

			return res.status(200).send({ user: sanitizeUser(user) });
		} catch (err) {
			return res.status(500).send({ message: 'Error al obtener usuario actual', error: err });
		}
	}
};

module.exports = controller;
