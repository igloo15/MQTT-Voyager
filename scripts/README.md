# Version Management Scripts

These scripts help maintain consistent version numbers across the project.

## 📦 Files Updated

When you run version scripts, the following files are updated:

1. **package.json** - `version` field (line 4)
2. **README.md** - Version badge (line 6)
3. **src/renderer/components/AboutModal.tsx** - `version` in appInfo (line 21)

## 🚀 Usage

### Check Current Version

```bash
npm run version
```

Shows the current version from package.json without making changes.

### Set Specific Version

```bash
npm run version 1.2.3
```

Updates all files to version `1.2.3`.

### Bump Version Automatically

```bash
# Bump patch version (0.7.0 → 0.7.1)
npm run bump:patch

# Bump minor version (0.7.0 → 0.8.0)
npm run bump:minor

# Bump major version (0.7.0 → 1.0.0)
npm run bump:major

# Bump to next release candidate (0.7.0 → 0.7.1-rc.0)
npm run bump:rc
```

## 📝 Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (1.0.0 → 2.0.0): Breaking changes
- **MINOR** version (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** version (1.0.0 → 1.0.1): Bug fixes, backward compatible
- **RC** version (1.0.0 → 1.0.1-rc.0): Release candidate for testing

## 🔄 Typical Workflow

### For a Bug Fix Release

```bash
# 1. Bump patch version
npm run bump:patch

# 2. Review changes
git diff

# 3. Commit
git commit -am "chore: bump version to 0.7.1"

# 4. Create tag
git tag v0.7.1

# 5. Push
git push && git push --tags
```

### For a New Feature Release

```bash
# 1. Bump minor version
npm run bump:minor

# 2. Review changes
git diff

# 3. Commit
git commit -am "chore: bump version to 0.8.0"

# 4. Create tag
git tag v0.8.0

# 5. Push
git push && git push --tags
```

### For a Breaking Change Release

```bash
# 1. Bump major version
npm run bump:major

# 2. Review changes
git diff

# 3. Commit
git commit -am "chore: bump version to 1.0.0"

# 4. Create tag
git tag v1.0.0

# 5. Push
git push && git push --tags
```

### For Testing (Release Candidate)

```bash
# 1. Create RC version
npm run bump:rc

# 2. Review changes
git diff

# 3. Commit
git commit -am "chore: release candidate 0.7.1-rc.0"

# 4. Test thoroughly
# ...

# 5. When ready, bump to final version
npm run version 0.7.1
git commit -am "chore: release version 0.7.1"
git tag v0.7.1
git push && git push --tags
```

## 🛠️ Script Details

### update-version.js

- Updates version across all project files
- Validates semantic versioning format
- Provides helpful next steps
- Safe to run multiple times (idempotent)

### bump-version.js

- Automatically calculates new version
- Supports patch, minor, major, and RC bumps
- Calls update-version.js internally
- Validates bump type

## ✅ Validation

The scripts validate that version numbers follow semantic versioning:

- ✅ Valid: `1.0.0`, `2.1.3`, `0.7.1-rc.0`, `1.0.0-beta.1`
- ❌ Invalid: `1`, `1.0`, `v1.0.0`, `1.0.0-RC-1`

## 🔍 Troubleshooting

**Script not found error?**
```bash
# Ensure you're in the project root
cd /path/to/MQTT-Voyager

# Scripts should be in scripts/ folder
ls scripts/
```

**Permission denied?**
```bash
# On Linux/macOS, make scripts executable
chmod +x scripts/*.js
```

**Changes not reflected?**
- Check that files were actually modified: `git diff`
- Ensure you're looking at the right files
- Try running the script again

## 📚 Examples

```bash
# Check current version
$ npm run version
📦 No version specified, reading from package.json...
   Current version: 0.7.0

# Bump patch
$ npm run bump:patch
📦 Current version: 0.7.0
🔄 Bumping patch version...
📈 New version: 0.7.1

✅ package.json: 0.7.0 → 0.7.1
✅ README.md: Updated version badge to 0.7.1
✅ AboutModal.tsx: 0.7.0 → 0.7.1

✨ Successfully updated 3 file(s) to version 0.7.1

# Set specific version
$ npm run version 1.0.0
🚀 Updating version to 1.0.0...

✅ package.json: 0.7.1 → 1.0.0
✅ README.md: Updated version badge to 1.0.0
✅ AboutModal.tsx: 0.7.1 → 1.0.0

✨ Successfully updated 3 file(s) to version 1.0.0
```

## 🚀 Integration with CI/CD

These scripts work great with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      # Build and create release
      - run: npm install
      - run: npm run make

      # The version is already in package.json from the tag
```

## 💡 Tips

1. **Always review changes** before committing: `git diff`
2. **Test the app** after version bump: `npm start`
3. **Create annotated tags** for releases: `git tag -a v1.0.0 -m "Release 1.0.0"`
4. **Update CHANGELOG.md** manually before releasing
5. **Use RC versions** for pre-release testing

---

For more information, see the [main README](../README.md).
