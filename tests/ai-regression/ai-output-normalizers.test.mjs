import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normalizeOcrSingleResult,
  normalizeOcrStructuredResult,
  normalizeParsedTransactions,
  normalizeVoiceReviewMatches,
} from '../../supabase/functions/_shared/ai-output-normalizers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ocrCases = JSON.parse(
  readFileSync(path.join(__dirname, 'ocr-cases.json'), 'utf8'),
);
const voiceCases = JSON.parse(
  readFileSync(path.join(__dirname, 'voice-cases.json'), 'utf8'),
);

for (const testCase of ocrCases.single) {
  test(`OCR single: ${testCase.id}`, () => {
    const actual = normalizeOcrSingleResult(testCase.input);
    assert.deepStrictEqual(actual, testCase.expected);
  });
}

for (const testCase of ocrCases.structured) {
  test(`OCR structured: ${testCase.id}`, () => {
    const actual = normalizeOcrStructuredResult(testCase.input);
    assert.deepStrictEqual(actual, testCase.expected);
  });
}

for (const testCase of voiceCases.parse) {
  test(`Voice parse: ${testCase.id}`, () => {
    const actual = normalizeParsedTransactions(
      testCase.input,
      testCase.expenseCategories,
      testCase.incomeCategories,
    );
    assert.deepStrictEqual(actual, testCase.expected);
  });
}

for (const testCase of voiceCases.reviewMatches) {
  test(`Voice review matches: ${testCase.id}`, () => {
    const actual = normalizeVoiceReviewMatches(
      testCase.input,
      testCase.availableCategories,
    );
    assert.deepStrictEqual(actual, testCase.expected);
  });
}
