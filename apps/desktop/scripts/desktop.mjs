import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(desktopRoot, "../..");
const localCargo = path.join(repositoryRoot, ".toolchains/cargo");
const env = { ...process.env };
if (existsSync(path.join(localCargo, "bin/cargo"))) {
  env.CARGO_HOME = localCargo;
  env.RUSTUP_HOME = path.join(repositoryRoot, ".toolchains/rustup");
  env.PATH = `${path.join(localCargo, "bin")}${path.delimiter}${env.PATH}`;
}
const [command, ...args] = process.argv.slice(2);
const nativeArgs = {
  "native-test": ["test", "--locked"],
  "native-lock": ["update", "--workspace"],
  "native-check": ["check", "--locked"],
}[command];
const executable = nativeArgs
  ? "cargo"
  : path.join(desktopRoot, "node_modules/.bin/tauri");
const child = spawn(
  executable,
  nativeArgs ? [...nativeArgs, ...args] : [command ?? "dev", ...args],
  {
    cwd: nativeArgs ? path.join(desktopRoot, "src-tauri") : desktopRoot,
    env,
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(`桌面工具链不可用：${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
