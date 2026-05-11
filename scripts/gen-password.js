#!/usr/bin/env node
/**
 * Generate Bcrypt Hash buat ADMIN_PASSWORD_HASH
 *
 * Cara pakai:
 *   node scripts/gen-password.js
 *   → ketik password lo
 *   → copy hash hasilnya ke .env (ADMIN_PASSWORD_HASH=...)
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n🔐 Surflix · Admin Password Generator\n');

rl.question('Ketik password admin: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('❌ Password minimal 8 karakter');
    rl.close();
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  console.log('\n✅ Hash generated!\n');
  console.log('Copy line ini ke .env:\n');
  console.log(`ADMIN_PASSWORD_HASH='${hash}'\n`);

  rl.close();
});
