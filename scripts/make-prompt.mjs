// scripts/make-prompt.ts（と、それが使う src の計算モジュール）を、リポジトリ同梱の
// tsc で CommonJS に変換して node で実行するラッパー。アプリ本体のビルド（vite）とは
// 独立に、CLI だけを動かすためのもの。
// 変換結果は scripts/.prompt-build/ に置き、ソースより古いときだけ変換し直す。
// 本体 package.json が "type": "module" のため、変換先には commonjs 宣言を置く。
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(root, 'scripts', '.prompt-build');

// 変換対象（src の計算層だけを使う。DOM・CSS には触れない）
const SOURCES = ['src/fortune.ts', 'src/texts.ts', 'src/name.ts', 'scripts/make-prompt.ts'];
const OUTPUTS = SOURCES.map((s) => s.replace(/\.ts$/, '.js'));

function needsBuild() {
  if (!existsSync(join(buildDir, 'package.json'))) return true;
  return SOURCES.some((src, i) => {
    const out = join(buildDir, OUTPUTS[i]);
    if (!existsSync(out)) return true;
    return statSync(join(root, src)).mtimeMs > statSync(out).mtimeMs;
  });
}

function build() {
  mkdirSync(buildDir, { recursive: true });
  writeFileSync(join(buildDir, 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
  const tsc = join(root, 'node_modules', '.bin', 'tsc');
  const r = spawnSync(tsc, [
    ...SOURCES,
    '--ignoreConfig',
    '--outDir', buildDir,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--skipLibCheck',
  ], { cwd: root, encoding: 'utf8' });
  // 型エラーがあっても JS が出力されていれば実行はできる。出力自体が無い場合だけ失敗とする
  const missing = OUTPUTS.filter((o) => !existsSync(join(buildDir, o)));
  if (missing.length) {
    console.error('CLI のビルドに失敗しました:');
    console.error(r.stdout ?? '');
    console.error(r.stderr ?? '');
    console.error(`出力がありません: ${missing.join(', ')}`);
    process.exit(1);
  }
}

if (needsBuild()) build();
const entry = join(buildDir, 'scripts', 'make-prompt.js');
try {
  execFileSync(process.execPath, [entry, ...process.argv.slice(2)], { stdio: 'inherit' });
} catch (e) {
  process.exit(typeof e?.status === 'number' ? e.status : 1);
}
