#!/usr/bin/env node
import crypto from 'crypto';

const name = process.argv[2] || 'default';
const role = process.argv[3] || 'user';
const key = `skp_${crypto.randomBytes(24).toString('hex')}`;

console.log(`\n🔑 Generated API Key`);
console.log(`   Name: ${name}`);
console.log(`   Role: ${role}`);
console.log(`   Key:  ${key}\n`);
console.log(`Add to Railway env:`);
console.log(`   API_KEYS=${key}:${name}:${role}\n`);
