import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

function readProjectFile(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('OCR prompt keeps strict JSON/no-invention guardrails', () => {
  const source = readProjectFile('supabase/functions/ocr-receipt/index.ts');
  assert.match(source, /Return JSON only/i);
  assert.match(source, /Never invent values/i);
  assert.match(source, /If unclear, return null/i);
  assert.match(source, /"transaction_type": "expense" \| "income" \| "transfer"/i);
});

test('Voice transcription prompt keeps anti-hallucination guardrails', () => {
  const source = readProjectFile('supabase/functions/transcribe-voice/index.ts');
  assert.match(source, /return empty string ""/i);
  assert.match(source, /Do not hallucinate/i);
  assert.match(source, /Do not .*translate|normalize|correct/i);
});

test('Voice parsing prompt keeps category discipline guardrails', () => {
  const source = readProjectFile('supabase/functions/parse-transaction/index.ts');
  assert.match(source, /MUST be EXACTLY one of the listed categories/i);
  assert.match(source, /Never output a category that is not in the provided lists/i);
});
