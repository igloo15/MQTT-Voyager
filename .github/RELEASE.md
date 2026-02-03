# Release Process

This document describes how to build and release MQTT Voyager using GitHub Actions.

## Automated Workflows

### CI Build (`ci.yml`)

Automatically runs on:
- Pull requests
- Pushes to `master` or `main` branch

**Purpose:** Validates that the application builds successfully and runs linting.

**Artifacts:** Build artifacts are uploaded and retained for 7 days.

### Build and Release (`build-release.yml`)

This workflow handles creating releases with built Windows installers.

## Creating a Release

### Method 1: Using Git Tags (Recommended)

1. **Update version in `package.json`**
   ```bash
   # Update the version field in package.json
   # Example: "version": "1.0.1"
   ```

2. **Commit and push the version change**
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.1"
   git push origin master
   ```

3. **Create and push a git tag**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

4. **Automated process:**
   - GitHub Actions detects the new tag
   - Builds the Windows application
   - Creates a GitHub release automatically
   - Uploads the installer and artifacts to the release

### Method 2: Manual Workflow Dispatch

1. **Navigate to Actions tab on GitHub**
   - Go to your repository on GitHub
   - Click on "Actions" tab
   - Select "Build and Release" workflow

2. **Run workflow**
   - Click "Run workflow" button
   - Enter the version (e.g., `v1.0.1`)
   - Click "Run workflow"

3. **Result:**
   - Creates a **draft release** that you can review and edit
   - Uploads all build artifacts
   - You must manually publish the draft release when ready

## Build Outputs

The workflow creates the following artifacts:

- **Windows Installer** (`.exe`) - Squirrel.Windows installer
- **Windows Zip** (`.zip`) - Portable version
- **NuGet packages** (`.nupkg`) - For Squirrel.Windows updates

## Requirements

- The repository must have proper permissions set for `GITHUB_TOKEN` to create releases
- Tags must follow semantic versioning: `v<major>.<minor>.<patch>` (e.g., `v1.0.0`)

## Troubleshooting

### Build Fails

1. Check the Actions logs for specific errors
2. Ensure `package.json` dependencies are correctly specified
3. Verify `forge.config.ts` is properly configured

### Release Not Created

1. Verify you pushed the tag: `git push origin <tag-name>`
2. Check that the tag follows the format `v*.*.*`
3. Ensure GitHub Actions has write permissions for releases

### Missing Artifacts

1. Check the "Upload artifacts" step in the workflow logs
2. Verify the build completed successfully
3. Ensure the output paths in `build-release.yml` match the actual build output structure

## Version Naming Convention

Follow semantic versioning:
- **Major** (v1.0.0 → v2.0.0): Breaking changes
- **Minor** (v1.0.0 → v1.1.0): New features, backward compatible
- **Patch** (v1.0.0 → v1.0.1): Bug fixes, backward compatible

Examples:
- `v1.0.0` - Initial release
- `v1.0.1` - Bug fix release
- `v1.1.0` - New feature release
- `v2.0.0` - Major version with breaking changes
