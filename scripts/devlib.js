const os = require('os');

// Interfaces that exist on a Mac but are never the Wi-Fi the phone is on
// (loopback, internet sharing bridges, VPN tunnels, AirDrop, VMs, containers)
const SKIP = /^(lo|bridge|utun|awdl|llw|ap|anpi|gif|stf|vmnet|vboxnet|docker|veth|br-)/;
const isPrivate = (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);

// The address the iPhone can reach: private IPv4 of the real network card, en0 first.
function pickLanIp(ifaces = os.networkInterfaces()) {
  const found = [];
  for (const [name, list] of Object.entries(ifaces)) {
    if (SKIP.test(name)) continue;
    for (const i of list || []) {
      if ((i.family === 'IPv4' || i.family === 4) && !i.internal && isPrivate(i.address)) found.push({ name, address: i.address });
    }
  }
  const best = found.find((f) => f.name === 'en0') || found.find((f) => /^(en|wlan|eth)/.test(f.name)) || found[0];
  return best ? best.address : null;
}

// Expo Go cannot open a project that declares native config plugins: Expo then starts a
// "development build" and the QR code opens nothing. `expo install` adds such plugins
// (expo-font, expo-sharing...) without asking, so they are removed before every start.
function stripPlugins(appJson) {
  const expo = appJson && appJson.expo;
  if (!expo || !Array.isArray(expo.plugins) || expo.plugins.length === 0) return { config: appJson, removed: [] };
  const removed = expo.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  const { plugins, ...rest } = expo;
  return { config: { ...appJson, expo: rest }, removed };
}

module.exports = { pickLanIp, stripPlugins, SKIP };
