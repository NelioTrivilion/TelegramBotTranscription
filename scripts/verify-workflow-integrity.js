#!/usr/bin/env node
/**
 * Integrity check for the published n8n workflow.
 *
 * Run before every commit/push:  node scripts/verify-workflow-integrity.js
 * Exit code 0 = clean, 1 = a secret or a broken reference was found.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, 'workflows', 'telegram-resumen-bot.json');
const EXPECTED_NODES = 24;

// Bracket the first character so this file does not match its own patterns.
const SECRET_PATTERNS = [
  /[s]d_[A-Za-z0-9]{10,}/,
  /[s]k_[A-Za-z0-9]{20,}/,
  /[x]ox[bp]-/,
  /[0-9]{8,10}:[A-Za-z0-9_-]{30,}/,
  /vMDHi[w]F9WoME7MZ0/,
];

let failed = false;
const fail = (message) => {
  failed = true;
  console.error(`FAIL: ${message}`);
};

function scan(text, where) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) fail(`secret-like value ${pattern} in ${where}`);
  }
}

// 1. No secrets in tracked files.
for (const file of execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)) {
  scan(fs.readFileSync(path.join(ROOT, file), 'utf8'), file);
}

// 2. No secrets in git history.
scan(
  execSync('git log -p --all', { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }),
  'git history'
);

// 3. Structural checks on the workflow.
const workflow = JSON.parse(fs.readFileSync(WORKFLOW, 'utf8'));
const names = new Set(workflow.nodes.map((node) => node.name));

if (workflow.nodes.length !== EXPECTED_NODES) {
  fail(`expected ${EXPECTED_NODES} nodes, found ${workflow.nodes.length}`);
}

for (const node of workflow.nodes) {
  for (const field of ['name', 'type', 'typeVersion', 'position', 'id']) {
    if (!(field in node)) fail(`${node.name} is missing "${field}"`);
  }
  if ('credentials' in node) fail(`${node.name} still carries a credential reference`);
  if ('webhookId' in node) fail(`${node.name} still carries an instance webhookId`);
}

for (const key of ['id', 'versionId', 'meta']) {
  if (key in workflow) fail(`workflow still carries instance metadata "${key}"`);
}

// 4. Every $('Node Name') expression must resolve to an existing node.
const referencePattern = /\$\(\s*'([^']+)'\s*\)/g;
for (const node of workflow.nodes) {
  const serialized = JSON.stringify(node.parameters ?? {});
  let match;
  while ((match = referencePattern.exec(serialized)) !== null) {
    if (!names.has(match[1])) fail(`dangling $('${match[1]}') in node "${node.name}"`);
  }
}

// 5. Every connection endpoint must resolve to an existing node.
for (const [source, channels] of Object.entries(workflow.connections)) {
  if (!names.has(source)) fail(`connection source "${source}" does not exist`);
  for (const branch of Object.values(channels)) {
    for (const targets of branch) {
      for (const target of targets ?? []) {
        if (!names.has(target.node)) fail(`connection target "${target.node}" does not exist`);
      }
    }
  }
}

// 6. The two-branch Merge must still receive both inputs.
const mergeInputs = [];
for (const channels of Object.values(workflow.connections)) {
  for (const targets of channels.main ?? []) {
    for (const target of targets ?? []) {
      if (target.node === 'Unir fuentes') mergeInputs.push(target.index);
    }
  }
}
if (!mergeInputs.includes(0) || !mergeInputs.includes(1)) {
  fail(`"Unir fuentes" expects inputs 0 and 1, found ${JSON.stringify(mergeInputs)}`);
}

// 7. Placeholders must never be replaced by real keys.
const headerValue = (nodeName, headerName) => {
  const node = workflow.nodes.find((candidate) => candidate.name === nodeName);
  const headers = node?.parameters?.headerParameters?.parameters ?? [];
  return headers.find((header) => header.name === headerName)?.value;
};

if (headerValue('Transcripción (Supadata)', 'x-api-key') !== 'YOUR_SUPADATA_API_KEY') {
  fail('Supadata node must keep the YOUR_SUPADATA_API_KEY placeholder');
}
if (headerValue('Generar audio (ElevenLabs)', 'xi-api-key') !== 'YOUR_ELEVENLABS_API_KEY') {
  fail('ElevenLabs node must keep the YOUR_ELEVENLABS_API_KEY placeholder');
}

if (failed) process.exit(1);
console.log('workflow integrity: OK');
