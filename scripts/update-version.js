#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Update version across multiple files in the project
 * Usage: node scripts/update-version.js [new-version]
 * Example: node scripts/update-version.js 1.0.0
 *
 * If no version is provided, reads from package.json
 */

const rootDir = path.join(__dirname, '..');

// Get version from command line argument or package.json
let newVersion = process.argv[2];

if (!newVersion) {
  console.log('📦 No version specified, reading from package.json...');
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  newVersion = packageJson.version;
  console.log(`   Current version: ${newVersion}`);
  console.log('   To update version, run: npm run version <new-version>');
  console.log('   Example: npm run version 1.0.0');
  process.exit(0);
}

// Validate version format (semantic versioning)
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
if (!semverRegex.test(newVersion)) {
  console.error('❌ Invalid version format. Please use semantic versioning (e.g., 1.0.0, 2.1.3-beta.1)');
  process.exit(1);
}

console.log(`\n🚀 Updating version to ${newVersion}...\n`);

let filesUpdated = 0;

// 1. Update package.json
try {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;

  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

  console.log(`✅ package.json: ${oldVersion} → ${newVersion}`);
  filesUpdated++;
} catch (error) {
  console.error('❌ Failed to update package.json:', error.message);
}

// 2. Update README.md
try {
  const readmePath = path.join(rootDir, 'README.md');
  let readmeContent = fs.readFileSync(readmePath, 'utf8');

  // Find and replace version badge
  const versionBadgeRegex = /\[!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[^-]+-blue\.svg\)\]/;
  const oldMatch = readmeContent.match(versionBadgeRegex);

  if (oldMatch) {
    const newBadge = `[![Version](https://img.shields.io/badge/version-${newVersion}-blue.svg)]`;
    readmeContent = readmeContent.replace(versionBadgeRegex, newBadge);
    fs.writeFileSync(readmePath, readmeContent, 'utf8');

    console.log(`✅ README.md: Updated version badge to ${newVersion}`);
    filesUpdated++;
  } else {
    console.warn('⚠️  README.md: Could not find version badge to update');
  }
} catch (error) {
  console.error('❌ Failed to update README.md:', error.message);
}

// 3. Update AboutModal.tsx
try {
  const aboutModalPath = path.join(rootDir, 'src', 'renderer', 'components', 'AboutModal.tsx');
  let aboutModalContent = fs.readFileSync(aboutModalPath, 'utf8');

  // Find and replace version in appInfo object
  const versionLineRegex = /version:\s*['"]([^'"]+)['"]/;
  const oldMatch = aboutModalContent.match(versionLineRegex);

  if (oldMatch) {
    const oldVersion = oldMatch[1];
    aboutModalContent = aboutModalContent.replace(
      versionLineRegex,
      `version: '${newVersion}'`
    );
    fs.writeFileSync(aboutModalPath, aboutModalContent, 'utf8');

    console.log(`✅ AboutModal.tsx: ${oldVersion} → ${newVersion}`);
    filesUpdated++;
  } else {
    console.warn('⚠️  AboutModal.tsx: Could not find version line to update');
  }
} catch (error) {
  console.error('❌ Failed to update AboutModal.tsx:', error.message);
}

// Summary
console.log(`\n✨ Successfully updated ${filesUpdated} file(s) to version ${newVersion}`);
console.log('\n📝 Next steps:');
console.log('   1. Review the changes: git diff');
console.log(`   2. Commit the changes: git commit -am "chore: bump version to ${newVersion}"`);
console.log(`   3. Create a git tag: git tag v${newVersion}`);
console.log('   4. Push changes: git push && git push --tags');
console.log('\n💡 Tip: Use "npm run bump:patch", "npm run bump:minor", or "npm run bump:major" for automatic version bumping');
