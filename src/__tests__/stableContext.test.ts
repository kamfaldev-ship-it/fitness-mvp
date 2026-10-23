describe('stableContext', () => {
  test('a re-evaluated module (Fast Refresh) still gets the same context object', () => {
    let first: unknown;
    let second: unknown;
    jest.isolateModules(() => {
      first = require('../stableContext').stableContext('test.ctx', null);
    });
    jest.isolateModules(() => {
      second = require('../stableContext').stableContext('test.ctx', null);
    });
    expect(second).toBe(first);
  });

  test('different names stay separate', () => {
    const { stableContext } = require('../stableContext');
    expect(stableContext('a', 1)).not.toBe(stableContext('b', 1));
  });
});
