#!/usr/bin/env bash
# Cuts a tagged release: bumps the version, commits, tags, pushes, builds the
# .xdc, and publishes it as a GitHub release asset.
#
# Usage: npm run release -- <version>   (e.g. npm run release -- 0.3.0)
#        ./scripts/release.sh <version> [--yes]
#
# --yes / -y  skip the confirmation prompt before pushing/publishing.

set -euo pipefail

BRANCH="main"
ASSET_NAME="sondaggio.xdc"

usage() {
  echo "Usage: $0 <version> [--yes]" >&2
  echo "  e.g. $0 0.3.0" >&2
  exit 1
}

VERSION=""
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    -h|--help) usage ;;
    *)
      if [ -n "$VERSION" ]; then usage; fi
      VERSION="$arg"
      ;;
  esac
done
[ -n "$VERSION" ] || usage

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: version must look like X.Y.Z (got '$VERSION')" >&2
  exit 1
fi
TAG="v$VERSION"

command -v gh >/dev/null 2>&1 || { echo "error: 'gh' CLI is required (https://cli.github.com)" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: 'gh' is not authenticated — run 'gh auth login'" >&2; exit 1; }

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "error: on branch '$CURRENT_BRANCH', expected '$BRANCH'" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is not clean — commit or stash your changes first" >&2
  exit 1
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: tag '$TAG' already exists locally" >&2
  exit 1
fi

if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "error: tag '$TAG' already exists on origin" >&2
  exit 1
fi

echo "About to release $TAG:"
echo "  - bump package.json/package-lock.json to $VERSION"
echo "  - commit, tag, and push to origin/$BRANCH"
echo "  - build $ASSET_NAME and publish it as a GitHub release"
if [ "$ASSUME_YES" -ne 1 ]; then
  read -r -p "Continue? [y/N] " REPLY
  case "$REPLY" in
    [yY]|[yY][eE][sS]) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

npm version "$VERSION" --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION for tagged release"
git tag "$TAG"

git push origin "$BRANCH"
git push origin "$TAG"

npm run pack

gh release create "$TAG" "$ASSET_NAME" --title "$TAG" --notes ""
rm -f "$ASSET_NAME"

echo "Released $TAG: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/$TAG"
