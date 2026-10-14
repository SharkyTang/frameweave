#!/bin/sh
# Official Rust installer, isolated to this checkout. No sudo or shell-profile edits.
set -eu
desktop_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repository_dir=$(CDPATH= cd -- "$desktop_dir/../.." && pwd)
export CARGO_HOME="$repository_dir/.toolchains/cargo"
export RUSTUP_HOME="$repository_dir/.toolchains/rustup"
mkdir -p "$repository_dir/.toolchains"
curl --proto '=https' --tlsv1.2 -fL --retry 2 \
  https://static.rust-lang.org/rustup/dist/aarch64-apple-darwin/rustup-init \
  -o "$repository_dir/.toolchains/rustup-init"
chmod u+x "$repository_dir/.toolchains/rustup-init"
"$repository_dir/.toolchains/rustup-init" -y --no-modify-path --profile minimal --default-toolchain stable
"$CARGO_HOME/bin/rustc" --version
