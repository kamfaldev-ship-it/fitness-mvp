const { pickLanIp, stripPlugins } = require('../../scripts/devlib');

const nic = (address: string, internal = false) => [{ family: 'IPv4', address, internal }];

describe('pickLanIp', () => {
  test('picks the Wi-Fi card on a Mac that also has sharing bridges and a VPN', () => {
    const ifaces = {
      lo0: nic('127.0.0.1', true),
      bridge0: nic('192.168.2.1'),
      bridge100: nic('192.168.3.1'),
      utun3: nic('10.8.0.2'),
      en0: nic('192.168.0.102'),
    };
    expect(pickLanIp(ifaces)).toBe('192.168.0.102');
  });
  test('ignores public and link-local addresses', () => {
    expect(pickLanIp({ en0: nic('169.254.10.2'), en1: nic('8.8.8.8') })).toBeNull();
  });
  test('falls back to another real card when en0 is absent', () => {
    expect(pickLanIp({ en5: nic('10.0.0.7') })).toBe('10.0.0.7');
  });
  test('no network', () => {
    expect(pickLanIp({ lo0: nic('127.0.0.1', true) })).toBeNull();
  });
});

describe('stripPlugins', () => {
  test('removes plugins that force a development build', () => {
    const r = stripPlugins({ expo: { name: 'a', plugins: ['expo-font', ['expo-image', {}]] } });
    expect(r.removed).toEqual(['expo-font', 'expo-image']);
    expect('plugins' in r.config.expo).toBe(false);
    expect(r.config.expo.name).toBe('a');
  });
  test('leaves a clean config untouched', () => {
    const cfg = { expo: { name: 'a' } };
    expect(stripPlugins(cfg)).toEqual({ config: cfg, removed: [] });
  });
});
