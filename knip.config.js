/** @type {import('knip').KnipConfig} */
const config = {
  entry: [
    'scripts/core/analyze.js',
    'scripts/core/db-setup.js',
    'scripts/testing/test-system.js',
    'scripts/search/search-engine.js',
    'scripts/testing/load-tester.js',
    'scripts/analytics/effectiveness-tracker.js',
    'scripts/performance/performance-optimizer.js',
    'scripts/security/security-enhancer.js',
    'scripts/analytics/learning-cycle.js'
  ],
  project: [
    'scripts/**/*.js'
  ],
  ignore: [
    'output/**',
    'database/**',
    'temp/**',
    'node_modules/**',
    '*.log',
    '*.backup'
  ],
  ignoreDependencies: [
    'sqlite3', // ネイティブモジュール
    'readline-sync' // CLI専用
  ]
};

module.exports = config;