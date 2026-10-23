#!/usr/bin/env node
/*
 * Starts the app for Expo Go the reliable way. Use `npm start` instead of `npx expo start`.
 *
 *   npm start               direct mode over Wi-Fi (default)
 *   npm run start:clean     same, with an empty Metro cache
 *   npm run start:tunnel    through ngrok, only if the Wi-Fi blocks the phone
 *   node scripts/dev.js --dry   show what would happen, start nothing
 *
 * Before launching it fixes the things that kept breaking the connection:
 *   1. removes native plugins from app.json (they force a development build Expo Go cannot open)
 *   2. stops servers of THIS project left running (they hold the port and the QR code points to them)
 *   3. forces the QR code to use the real Wi-Fi address (a Mac has several network interfaces)
 */
const fs = require('fs');
const net = require('net');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { pickLanIp, stripPlugins } = require('./devlib');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const dry = flag('--dry');
const tunnel = flag('--tunnel');
const say = (m) => console.log(`\x1b[36m[dev]\x1b[0m ${m}`);

// 1. app.json
const appJsonPath = path.join(root, 'app.json');
const { config, removed } = stripPlugins(JSON.parse(fs.readFileSync(appJsonPath, 'utf8')));
if (removed.length) {
  say(`app.json : plugin(s) retiré(s) pour Expo Go : ${removed.join(', ')}`);
  if (!dry) fs.writeFileSync(appJsonPath, JSON.stringify(config, null, 2) + '\n');
}

// 2. stale servers of this project only (other Expo projects are left alone)
const expoBin = path.join(root, 'node_modules', '.bin', 'expo');
function staleServers() {
  try {
    return execSync(`pgrep -f ${JSON.stringify(expoBin + ' start')}`, { encoding: 'utf8' })
      .split('\n')
      .map((s) => parseInt(s, 10))
      .filter((pid) => pid && pid !== process.pid && pid !== process.ppid);
  } catch {
    return [];
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isFree = (port) =>
  new Promise((resolve) => {
    const srv = net.createServer().once('error', () => resolve(false)).once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '0.0.0.0');
  });

async function main() {
  const stale = staleServers();
  if (stale.length) {
    say(`ancien serveur détecté (pid ${stale.join(', ')}) : arrêt`);
    if (!dry) {
      stale.forEach((pid) => { try { process.kill(pid, 'SIGTERM'); } catch {} });
      for (let i = 0; i < 20 && staleServers().length; i++) await sleep(150);
      staleServers().forEach((pid) => { try { process.kill(pid, 'SIGKILL'); } catch {} });
    }
  }

  let port = 8081;
  while (!(dry && stale.length) && !(await isFree(port)) && port < 8095) port++;

  // 3. the address the phone can actually reach
  const ip = tunnel ? null : pickLanIp();
  if (!tunnel && !ip) say('Aucune adresse Wi-Fi privée trouvée : vérifie que le Mac est connecté au Wi-Fi.');

  console.log('');
  say(tunnel ? 'Mode tunnel (ngrok).' : `Mode direct, adresse ${ip}, port ${port}`);
  if (!tunnel && ip) {
    say(`Test depuis Safari sur l'iPhone : http://${ip}:${port}/status  ->  packager-status:running`);
    say(`Dans Expo Go > Enter URL manually : exp://${ip}:${port}`);
  }
  say("Rappel : l'iPhone doit être sur le même Wi-Fi, et Réglages > Expo Go > Réseau local doit être activé.");
  console.log('');
  if (dry) return;

  const env = { ...process.env, ...(ip ? { REACT_NATIVE_PACKAGER_HOSTNAME: ip } : {}) };
  const expoArgs = ['start', '--go', '--port', String(port), tunnel ? '--tunnel' : '--lan', ...(flag('--clear') ? ['--clear'] : [])];
  const child = spawn(expoBin, expoArgs, { cwd: root, env, stdio: 'inherit' });
  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => child.kill(sig)));
  child.on('exit', (code) => process.exit(code ?? 0));
}

main();
