const { detectGodObjects } = require('../godObjectDetector');

function row(overrides = {}) {
  return {
    path: 'a.js',
    isBinary: false,
    complexity: 5,
    lines: 10,
    functions: 1,
    imports: 1,
    classes: 0,
    methods: 0,
    ...overrides,
  };
}

function graph(outgoingByPath = {}) {
  return { outgoing: new Map(Object.entries(outgoingByPath)) };
}

describe('detectGodObjects', () => {
  it('does not flag a file with only one red-flag signal', () => {
    const rows = [row({ lines: 1000 })]; // only "large" fires
    expect(detectGodObjects(rows, graph())).toEqual([]);
  });

  it('flags a file once at least MIN_SCORE independent signals fire', () => {
    const rows = [row({ lines: 700, functions: 25, imports: 15 })]; // 3 signals
    const result = detectGodObjects(rows, graph());
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(3);
    expect(result[0].reasons).toHaveLength(3);
  });

  it('counts high outgoing dependency fan-out toward the imports signal', () => {
    const rows = [row({ path: 'hub.js', lines: 700, functions: 25, imports: 0 })];
    const result = detectGodObjects(rows, graph({ 'hub.js': 20 }));
    expect(result).toHaveLength(1);
  });

  it('counts a class with many methods as a signal', () => {
    const rows = [row({ lines: 700, functions: 25, classes: 1, methods: 16 })];
    const result = detectGodObjects(rows, graph());
    expect(result[0].score).toBe(3); // lines + functions + methods
  });

  it('never flags a file with zero complexity (e.g. pure config/data)', () => {
    const rows = [row({ lines: 5000, functions: 50, imports: 50, complexity: 0 })];
    expect(detectGodObjects(rows, graph())).toEqual([]);
  });

  it('sorts results by score, then by line count', () => {
    const rows = [
      row({ path: 'small-god.js', lines: 600, functions: 20, imports: 12 }),
      row({ path: 'big-god.js', lines: 5000, functions: 30, imports: 30, classes: 1, methods: 30 }),
    ];
    const result = detectGodObjects(rows, graph());
    expect(result[0].path).toBe('big-god.js');
  });
});
