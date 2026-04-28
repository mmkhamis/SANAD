// Parser-v2 fixture suite. Runs every case in cases.json against parseSms()
// and asserts each `expected` field. Uses Node's built-in test runner +
// --experimental-strip-types to consume the .ts modules directly.

import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { parseSms } from '../../supabase/functions/_shared/sms-parser-v2/index.ts';
import { buildDedupKey } from '../../supabase/functions/_shared/sms-parser-v2/dedup.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { cases } = JSON.parse(readFileSync(join(__dirname, 'cases.json'), 'utf8'));

for (const c of cases) {
  test(c.name, () => {
    const result = parseSms(c.text, c.ctx ?? {});
    for (const [key, expected] of Object.entries(c.expected)) {
      assert.deepStrictEqual(
        result[key],
        expected,
        `${c.name}.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(result[key])}\nfull: ${JSON.stringify(result, null, 2)}`,
      );
    }
  });
}

// Dedup hash determinism — case 01 vs 25 must collide on the dedup key
test('dedup: cases 01 and 25 collide', () => {
  const r01 = parseSms(cases.find((c) => c.name.startsWith('01')).text, cases.find((c) => c.name.startsWith('01')).ctx ?? {});
  const r25 = parseSms(cases.find((c) => c.name.startsWith('25')).text, cases.find((c) => c.name.startsWith('25')).ctx ?? {});
  assert.equal(buildDedupKey(r01), buildDedupKey(r25), 'expected identical dedup key for case 01 vs 25');
});
