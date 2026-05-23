#!/usr/bin/env bash
# Run on the Dokku server to install/update the deploy-preview-ci plugin.
# Usage: bash install.sh
set -eo pipefail

PLUGIN_DIR="/var/lib/dokku/plugins/available/deploy-preview-ci"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$PLUGIN_DIR/subcommands"
cp "$SCRIPT_DIR/deploy-preview-ci/plugin.toml"           "$PLUGIN_DIR/plugin.toml"
cp "$SCRIPT_DIR/deploy-preview-ci/subcommands/setup"     "$PLUGIN_DIR/subcommands/setup"
cp "$SCRIPT_DIR/deploy-preview-ci/subcommands/deploy"    "$PLUGIN_DIR/subcommands/deploy"
chmod +x "$PLUGIN_DIR/subcommands/setup" "$PLUGIN_DIR/subcommands/deploy"

# Enable if not already linked
if [[ ! -e "/var/lib/dokku/plugins/enabled/deploy-preview-ci" ]]; then
  dokku plugin:enable deploy-preview-ci
  echo "Plugin enabled."
else
  echo "Plugin updated (already enabled)."
fi
