#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const START_MARKER = '<!-- promptkit:start -->';
const END_MARKER = '<!-- promptkit:end -->';
const REGISTRY_PATH = path.join('.agent', 'promptkit', 'registry.json');

const PACKS_DIR = path.join(__dirname, '..', 'src', 'promptkit_builtin_packs');

function loadPack(name) {
  const packRoot = path.join(PACKS_DIR, name);
  const packJson = path.join(packRoot, 'pack.json');
  if (!fs.existsSync(packJson)) {
    throw new Error(`Pack not found: ${name}`);
  }
  const data = JSON.parse(fs.readFileSync(packJson, 'utf8'));
  return { ...data, root: packRoot };
}

function listAvailable() {
  if (!fs.existsSync(PACKS_DIR)) return [];
  return fs
    .readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(PACKS_DIR, d.name, 'pack.json')))
    .map((d) => loadPack(d.name));
}

function loadRegistry(repoRoot) {
  const regPath = path.join(repoRoot, REGISTRY_PATH);
  if (!fs.existsSync(regPath)) return { packs: [] };
  try {
    return JSON.parse(fs.readFileSync(regPath, 'utf8'));
  } catch (e) {
    return { packs: [] };
  }
}

function saveRegistry(repoRoot, registry) {
  const regPath = path.join(repoRoot, REGISTRY_PATH);
  fs.mkdirSync(path.dirname(regPath), { recursive: true });
  fs.writeFileSync(regPath, JSON.stringify(registry, null, 2));
}

function writeFile(dest, content, force) {
  const existed = fs.existsSync(dest);
  if (existed && !force) return 'unchanged';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
  return existed ? 'overwritten' : 'created';
}

function updateAgentsMd(repoRoot, snippets) {
  const agentsPath = path.join(repoRoot, 'AGENTS.md');
  const blockBody = snippets.map((s) => s.trim()).filter(Boolean).join('\n\n');
  const managed = `${START_MARKER}\n# Prompt Packs (managed by promptkit)\n\n${blockBody}\n${END_MARKER}\n`;

  if (!fs.existsSync(agentsPath)) {
    fs.writeFileSync(agentsPath, managed, 'utf8');
    return 'created';
  }

  const content = fs.readFileSync(agentsPath, 'utf8');
  let newContent;
  if (content.includes(START_MARKER) && content.includes(END_MARKER)) {
    const before = content.split(START_MARKER)[0].trimEnd();
    const after = content.split(END_MARKER)[1].trimStart();
    newContent = `${before}\n\n${managed}${after}`;
  } else {
    newContent = content.trimEnd();
    if (newContent) newContent += '\n\n';
    newContent += managed;
  }
  fs.writeFileSync(agentsPath, newContent, 'utf8');
  return 'updated';
}

function installPack(repoRoot, packName, force) {
  const pack = loadPack(packName);
  const registry = loadRegistry(repoRoot);

  const fileResults = pack.files.map((f) => {
    const srcPath = path.join(pack.root, f.source);
    const destPath = path.join(repoRoot, f.target);
    const status = writeFile(destPath, fs.readFileSync(srcPath, 'utf8'), force);
    return { target: f.target, status };
  });

  const snippet = fs.readFileSync(path.join(pack.root, pack.agents_entry), 'utf8').trim() + '\n';
  const packs = registry.packs.filter((p) => p.name !== pack.name);
  packs.push({
    name: pack.name,
    version: pack.version,
    source: 'builtin',
    installed_at: new Date().toISOString(),
    agents_snippet: snippet,
    files: fileResults,
  });
  registry.packs = packs;
  saveRegistry(repoRoot, registry);

  const agentsStatus = updateAgentsMd(repoRoot, packs.map((p) => p.agents_snippet));

  return { pack: pack.name, version: pack.version, files: fileResults, agents_md: agentsStatus };
}

function usage() {
  console.log(`promptkit (Node)\n\nCommands:\n  list [-p path]\n  install <pack> [-p path] [--force]\n`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    usage();
    return 0;
  }
  const cmd = args[0];
  const pathIndex = args.indexOf('-p') !== -1 ? args.indexOf('-p') : args.indexOf('--path');
  const repoRoot = pathIndex !== -1 ? args[pathIndex + 1] : '.';
  const force = args.includes('-f') || args.includes('--force');

  if (cmd === 'list') {
    const available = listAvailable();
    const installed = loadRegistry(path.resolve(repoRoot)).packs;
    console.log('Available packs:');
    available.forEach((p) => console.log(`- ${p.name} ${p.version}: ${p.description}`));
    console.log('\nInstalled packs:');
    if (!installed.length) console.log('- (none)');
    installed.forEach((p) => console.log(`- ${p.name} ${p.version} (source: ${p.source})`));
    return 0;
  }

  if (cmd === 'install') {
    const packName = args[1];
    if (!packName) {
      console.error('install requires a pack name');
      return 1;
    }
    const result = installPack(path.resolve(repoRoot), packName, force);
    console.log(`Installed pack '${result.pack}' v${result.version}`);
    result.files.forEach((f) => console.log(`  ${f.target}: ${f.status}`));
    console.log(`AGENTS.md: ${result.agents_md}`);
    return 0;
  }

  console.error(`Unknown command: ${cmd}`);
  usage();
  return 1;
}

if (require.main === module) {
  process.exit(main());
}
