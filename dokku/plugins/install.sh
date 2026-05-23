#!/usr/bin/env bash
# Run on the Dokku server to install/update the arkhana-ci plugin.
# Usage: bash install.sh
set -eo pipefail

PLUGIN_DIR="/var/lib/dokku/plugins/available/arkhana-ci"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$PLUGIN_DIR/subcommands"
cp "$SCRIPT_DIR/arkhana-ci/plugin.toml"           "$PLUGIN_DIR/plugin.toml"
cp "$SCRIPT_DIR/arkhana-ci/subcommands/setup"     "$PLUGIN_DIR/subcommands/setup"
cp "$SCRIPT_DIR/arkhana-ci/subcommands/deploy"    "$PLUGIN_DIR/subcommands/deploy"
chmod +x "$PLUGIN_DIR/subcommands/setup" "$PLUGIN_DIR/subcommands/deploy"

# Enable if not already linked
if [[ ! -e "/var/lib/dokku/plugins/enabled/arkhana-ci" ]]; then
  dokku plugin:enable arkhana-ci
  echo "Plugin enabled."
else
  echo "Plugin updated (already enabled)."
fi
