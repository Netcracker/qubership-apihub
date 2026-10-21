const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { landingCardCheck, landingCardPath } = require('./landing-card')

test('landingCardPath turns the version into the card file name', () => {
  assert.equal(landingCardPath('2.15.1'), 'sites/landing/src/content/releases/v2-15-1.md')
})

test('landingCardCheck reports nothing when the card exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-card-'))
  try {
    const file = path.join(root, landingCardPath('2.15.1'))
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, '---\nversion: "v2.15.1"\n---\n')
    assert.deepEqual(landingCardCheck('2.15.1', root), {
      exists: true,
      file: 'sites/landing/src/content/releases/v2-15-1.md',
      warning: null,
      summary: null,
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('landingCardCheck warns when the card is missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-card-'))
  try {
    const result = landingCardCheck('2.15.1', root)
    assert.equal(result.exists, false)
    assert.match(result.warning, /v2-15-1\.md is missing for product version 2\.15\.1/)
    assert.match(result.summary, /^\*\*Warning:\*\* the landing release card/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
