'use strict'

var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var User = require('../modules/module-user');
var defaultCuentasService = require('./services/default-cuentas.service');
var defaultCuentasMiasService = require('./services/default-cuentas-mias.service');
var defaultCuentasOrangeService = require('./services/default-cuentas-orange.service');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_proyecto_almacen_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

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

async function canRegisterFirstUser() {
	const totalUsers = await User.countDocuments({});
	return totalUsers === 0;
}

function ensureDatabaseReady(res) {
	if (mongoose.connection.readyState === 1) {
		return true;
	}

	res.status(503).send({
		message: 'Base de datos no disponible. Verifica MONGO_URI y el acceso de red en MongoDB Atlas.'
	});

	return false;
}

function getErrorPayload(err, fallbackMessage) {
	return {
		message: fallbackMessage,
		error: {
			message: err?.message || fallbackMessage,
			name: err?.name || 'Error'
		}
	};
}

async function ensureDefaultAccounts() {
	await defaultCuentasService.inicializarCuentasPorDefecto();
	await defaultCuentasMiasService.inicializarCuentasMiasPorDefecto();
	await defaultCuentasOrangeService.inicializarCuentasOrangePorDefecto();
}

var controller = {
	register: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

			const canRegister = await canRegisterFirstUser();
			if (!canRegister) {
				return res.status(403).send({ message: 'El primer usuario ya fue creado' });
			}

			const name = String(req.body?.name || '').trim();
			const email = String(req.body?.email || '').trim().toLowerCase();
			const password = String(req.body?.password || '');
			const role = String(req.body?.role || 'admin').trim().toLowerCase();
			const ROLES_VALIDOS = ['admin', 'almacen', 'orange', 'orange_pos'];

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
				role: ROLES_VALIDOS.includes(role) ? role : 'admin'
			});

			const stored = await user.save();
			return res.status(201).send({ user: sanitizeUser(stored) });
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error al registrar usuario'));
		}
	},

	bootstrapStatus: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

			await ensureDefaultAccounts();

			const canRegister = await canRegisterFirstUser();
			return res.status(200).send({
				canRegisterFirstUser: canRegister
			});
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error al consultar el estado de autenticación inicial'));
		}
	},

	login: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

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

			await ensureDefaultAccounts();

			const token = signToken(user);
			return res.status(200).send({ token, user: sanitizeUser(user) });
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error en login'));
		}
	},

	me: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

			await ensureDefaultAccounts();

			const userId = String(req.user?.sub || '');
			if (!userId) return res.status(401).send({ message: 'No autorizado' });

			const user = await User.findById(userId);
			if (!user || !user.active) {
				return res.status(401).send({ message: 'No autorizado' });
			}

			return res.status(200).send({ user: sanitizeUser(user) });
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error al obtener usuario actual'));
		}
	},

	getUsers: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

			if (!req.user || req.user.role !== 'admin') {
				return res.status(403).send({ message: 'Solo el administrador puede listar usuarios' });
			}

			const users = await User.find({}).select('-password').sort({ createdAt: 1 });
			return res.status(200).send({ users: users.map(sanitizeUser) });
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error al obtener usuarios'));
		}
	},

	createUser: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

			if (!req.user || req.user.role !== 'admin') {
				return res.status(403).send({ message: 'Solo el administrador puede crear usuarios' });
			}

			const name = String(req.body?.name || '').trim();
			const email = String(req.body?.email || '').trim().toLowerCase();
			const password = String(req.body?.password || '');
			const role = String(req.body?.role || '').trim().toLowerCase();

			if (!email || !password) {
				return res.status(400).send({ message: 'Email y password son obligatorios' });
			}

			if (password.length < 6) {
				return res.status(400).send({ message: 'La contraseña debe tener al menos 6 caracteres' });
			}

			const ROLES_VALIDOS = ['admin', 'almacen', 'orange', 'orange_pos'];
			if (!ROLES_VALIDOS.includes(role)) {
				return res.status(400).send({ message: `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}` });
			}

			const exists = await User.findOne({ email });
			if (exists) {
				return res.status(409).send({ message: 'Ya existe un usuario con este email' });
			}

			const hashed = await bcrypt.hash(password, 10);
			const user = new User({ name: name || email, email, password: hashed, role, active: true });
			const stored = await user.save();
			return res.status(201).send({ user: sanitizeUser(stored) });
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error al crear usuario'));
		}
	},

	deleteUser: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

			if (!req.user || req.user.role !== 'admin') {
				return res.status(403).send({ message: 'Solo el administrador puede eliminar usuarios' });
			}

			const targetId = String(req.params?.id || '');
			if (!mongoose.Types.ObjectId.isValid(targetId)) {
				return res.status(400).send({ message: 'Id de usuario inválido' });
			}

			if (targetId === String(req.user.sub)) {
				return res.status(400).send({ message: 'No puedes eliminar tu propio usuario' });
			}

			const deleted = await User.findByIdAndDelete(targetId);
			if (!deleted) {
				return res.status(404).send({ message: 'Usuario no encontrado' });
			}

			return res.status(200).send({ message: 'Usuario eliminado', user: sanitizeUser(deleted) });
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error al eliminar usuario'));
		}
	},

	updateUser: async (req, res) => {
		try {
			if (!ensureDatabaseReady(res)) return;

			if (!req.user || req.user.role !== 'admin') {
				return res.status(403).send({ message: 'Solo el administrador puede actualizar usuarios' });
			}

			const targetId = String(req.params?.id || '');
			if (!mongoose.Types.ObjectId.isValid(targetId)) {
				return res.status(400).send({ message: 'Id de usuario inválido' });
			}

			const ROLES_VALIDOS = ['admin', 'almacen', 'orange', 'orange_pos'];
			const updates = {};

			if (req.body?.name !== undefined) {
				updates.name = String(req.body.name).trim();
			}
			if (req.body?.role !== undefined) {
				const role = String(req.body.role).trim().toLowerCase();
				if (!ROLES_VALIDOS.includes(role)) {
					return res.status(400).send({ message: `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}` });
				}
				updates.role = role;
			}
			if (req.body?.active !== undefined) {
				updates.active = Boolean(req.body.active);
			}
			if (req.body?.password) {
				const password = String(req.body.password);
				if (password.length < 6) {
					return res.status(400).send({ message: 'La contraseña debe tener al menos 6 caracteres' });
				}
				updates.password = await bcrypt.hash(password, 10);
			}

			const updated = await User.findByIdAndUpdate(targetId, { $set: updates }, { new: true });
			if (!updated) {
				return res.status(404).send({ message: 'Usuario no encontrado' });
			}

			return res.status(200).send({ user: sanitizeUser(updated) });
		} catch (err) {
			return res.status(500).send(getErrorPayload(err, 'Error al actualizar usuario'));
		}
	}
};

module.exports = controller;
