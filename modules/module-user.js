'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = Schema({
	name: { type: String, default: '', trim: true },
	email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
	password: { type: String, required: true },
	role: { type: String, default: 'admin', enum: ['admin', 'user'] },
	active: { type: Boolean, default: true },
	createdAt: { type: Date, default: Date.now }
}, { collection: 'users' });

module.exports = mongoose.model('User', UserSchema);
