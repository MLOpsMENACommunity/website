/**
 * Tests for the Quick Start Drive-folder sync.
 *
 * Run with `npm test` (node --test). `parseDriveFolder` is the brittle bit — it
 * scrapes ids and names out of the public folder page's bootstrap data — so the
 * tests pin its behaviour on realistic and adversarial input. They also guard
 * the two lists that must stay in step: the slugs the script downloads and the
 * GUIDE_SLUGS the site renders.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildIndex, parseDriveFolder } from './sync-quickstart.mjs'

const syncSrc = readFileSync(new URL('./sync-quickstart.mjs', import.meta.url), 'utf8')
const serverSrc = readFileSync(new URL('../src/lib/student-guides.server.ts', import.meta.url), 'utf8')

test('the sync slug list matches GUIDE_SLUGS in the server module', () => {
  const fromServer = serverSrc
    .match(/GUIDE_SLUGS = \[([^\]]+)\]/)[1]
    .match(/'([^']+)'/g)
    .map((s) => s.replace(/'/g, ''))
  const fromScript = syncSrc
    .match(/const GUIDE_SLUGS = \[([^\]]+)\]/)[1]
    .match(/'([^']+)'/g)
    .map((s) => s.replace(/'/g, ''))
  assert.deepEqual(fromScript, fromServer, 'sync-quickstart.mjs GUIDE_SLUGS drifted from the server list')
})

test('parses id + name pairs from folder bootstrap data', () => {
  /* Shape mirrors Drive's real payload: [fileId, [parentId], name, ...]. */
  const html = `window.data = [
    ["1AbcdefghijklmnopqrstuvwXYZ012345",["0parentfolderidAAAAAAAAAAAA"],"docker.pdf",1234],
    ["2ZyxwvutsrqponmlkjihgfeDCBA987654",["0parentfolderidAAAAAAAAAAAA"],"mlflow.pdf",5678]
  ]`
  const files = parseDriveFolder(html)
  assert.deepEqual(files, [
    { id: '1AbcdefghijklmnopqrstuvwXYZ012345', name: 'docker.pdf' },
    { id: '2ZyxwvutsrqponmlkjihgfeDCBA987654', name: 'mlflow.pdf' },
  ])
})

test('ignores non-pdf files', () => {
  const html = `[
    ["1AbcdefghijklmnopqrstuvwXYZ012345",["0parentfolderidAAAAAAAAAAAA"],"notes.txt",1],
    ["2ZyxwvutsrqponmlkjihgfeDCBA987654",["0parentfolderidAAAAAAAAAAAA"],"docker.pdf",2]
  ]`
  const files = parseDriveFolder(html)
  assert.equal(files.length, 1)
  assert.equal(files[0].name, 'docker.pdf')
})

test('de-duplicates a file id that appears twice', () => {
  const html = `[
    ["1AbcdefghijklmnopqrstuvwXYZ012345",["0parentfolderidAAAAAAAAAAAA"],"docker.pdf",1],
    ["1AbcdefghijklmnopqrstuvwXYZ012345",["0parentfolderidAAAAAAAAAAAA"],"docker.pdf",1]
  ]`
  assert.equal(parseDriveFolder(html).length, 1)
})

test('returns [] when the page shape is unrecognised', () => {
  assert.deepEqual(parseDriveFolder('<html><body>nothing here</body></html>'), [])
})

test('handles a name with escaped characters without truncating', () => {
  const html = `[["1AbcdefghijklmnopqrstuvwXYZ012345",["0parentfolderidAAAAAAAAAAAA"],"github-actions.pdf",9]]`
  const files = parseDriveFolder(html)
  assert.equal(files[0].name, 'github-actions.pdf')
})

test('parses the hex-escaped shape Drive actually serves', () => {
  /* Verbatim structure from a real public folder page: quotes are \\x22,
     brackets are \\x5b / \\x5d. */
  const html =
    "google.drive.ivd = '\\x5b\\x5b\\x5b\\x221UWG3RbWLMwUK97B3-0leWzP0nFvwDqot\\x22," +
    "\\x5b\\x221yqPc7Hpq9F-YB9Pi5sL2jqbZdkX7FAXz\\x22\\x5d,\\x22dvc.pdf\\x22," +
    "\\x22application/pdf\\x22'"
  const files = parseDriveFolder(html)
  assert.deepEqual(files, [
    { id: '1UWG3RbWLMwUK97B3-0leWzP0nFvwDqot', name: 'dvc.pdf' },
  ])
})

test('buildIndex maps topic files by slug in GUIDE_SLUGS order', () => {
  /* Given out of order; expected back in the canonical slug order. */
  const index = buildIndex([
    { id: 'idM', name: 'mlflow.pdf' },
    { id: 'idD', name: 'docker.pdf' },
  ])
  assert.deepEqual(index, { docker: 'idD', mlflow: 'idM' })
  assert.deepEqual(Object.keys(index), ['docker', 'mlflow'])
})

test('buildIndex is case-insensitive on the slug name', () => {
  const index = buildIndex([{ id: 'idD', name: 'Docker.PDF' }])
  assert.deepEqual(index, { docker: 'idD' })
})

test('buildIndex collects non-topic PDFs under _other, sorted by name', () => {
  const index = buildIndex([
    { id: 'idD', name: 'docker.pdf' },
    { id: 'idZ', name: 'zebra.pdf' },
    { id: 'idA', name: 'alpha guide.pdf' },
  ])
  assert.deepEqual(index, {
    docker: 'idD',
    _other: [
      { id: 'idA', name: 'alpha guide.pdf' },
      { id: 'idZ', name: 'zebra.pdf' },
    ],
  })
})

test('buildIndex handles an others-only folder (no topics)', () => {
  const index = buildIndex([{ id: 'idX', name: 'kubernetes-intro.pdf' }])
  assert.deepEqual(index, { _other: [{ id: 'idX', name: 'kubernetes-intro.pdf' }] })
})

test('buildIndex de-duplicates a repeated other id and keeps the first slug hit', () => {
  const index = buildIndex([
    { id: 'idD1', name: 'docker.pdf' },
    { id: 'idD2', name: 'docker.pdf' },
    { id: 'idX', name: 'extra.pdf' },
    { id: 'idX', name: 'extra.pdf' },
  ])
  assert.equal(index.docker, 'idD1')
  assert.deepEqual(index._other, [{ id: 'idX', name: 'extra.pdf' }])
})

test('buildIndex returns {} for an empty folder', () => {
  assert.deepEqual(buildIndex([]), {})
})
