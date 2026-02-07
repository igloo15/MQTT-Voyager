#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Bump version automatically (patch, minor, or major)
 * Usage: node scripts/bump-version.js [patch|minor|major|prepatch|preminor|premajor|prerelease]
 */

const bumpType = process.argv[2] || 'patch';
const validTypes = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];

if (!validTypes.includes(bumpType)) {
  console.error(`❌ Invalid bump type: ${bumpType}`);
  console.log(`   Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

// Read current version
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`\n📦 Current version: ${currentVersion}`);
console.log(`🔄 Bumping ${bumpType} version...\n`);

// Parse version
const [major, minor, patch] = currentVersion.split('-')[0].split('.').map(Number);
let newVersion;

// Calculate new version
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
  case 'prepatch':
    newVersion = `${major}.${minor}.${patch + 1}-rc.0`;
    break;
  case 'preminor':
    newVersion = `${major}.${minor + 1}.0-rc.0`;
    break;
  case 'premajor':
    newVersion = `${major + 1}.0.0-rc.0`;
    break;
  case 'prerelease':
    // Extract pre-release info
    const preMatch = currentVersion.match(/-rc\.(\d+)$/);
    if (preMatch) {
      const rcNumber = parseInt(preMatch[1]) + 1;
      newVersion = currentVersion.replace(/-rc\.\d+$/, `-rc.${rcNumber}`);
    } else {
      newVersion = `${major}.${minor}.${patch}-rc.0`;
    }
    break;
}

console.log(`📈 New version: ${newVersion}\n`);

// Run update-version script
try {
  const updateScript = path.join(__dirname, 'update-version.js');
  execSync(`node "${updateScript}" ${newVersion}`, { stdio: 'inherit' });

  console.log('\n🎉 Version bump complete!');
} catch (error) {
  console.error('\n❌ Failed to update version:', error.message);
  process.exit(1);
}
