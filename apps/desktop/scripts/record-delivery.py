"""Inspect the actual D2 bundle and write delivery evidence, without launching GUI."""
import hashlib
import json
import plistlib
import shutil
import struct
import subprocess
from datetime import datetime, timezone
from pathlib import Path

desktop = Path(__file__).resolve().parents[1]
repository = desktop.parents[1]
delivery = repository / 'deliverables' / 'D2'
docs = repository / 'docs' / 'desktop-workbench'
app = delivery / '逆向轻抖.app'
archive = delivery / '逆向轻抖-D2-mac-arm64.zip'
binary = app / 'Contents' / 'MacOS' / 'qingdou-workbench'
bundle_info = plistlib.loads((app / 'Contents' / 'Info.plist').read_bytes())
assert bundle_info['CFBundleIdentifier'] == 'com.sharkytang.qingdou.workbench'
assert bundle_info['CFBundleShortVersionString'] == '0.1.0'
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
architecture = subprocess.check_output(['file', str(binary)], text=True).strip()
assert 'arm64' in architecture
assert b'demo/three-scenes.mp4' in binary.read_bytes(), 'Bundled demo asset key is missing'
assert (desktop / 'dist' / 'demo' / 'three-scenes.mp4').stat().st_size > 0
assert (desktop / 'dist' / 'demo' / 'three-scenes.mp4').read_bytes() == (desktop / 'public' / 'demo' / 'three-scenes.mp4').read_bytes()
ui_results = json.loads((desktop / 'test-results' / 'ui-results.json').read_text())
assert ui_results['stats']['unexpected'] == 0
assert ui_results['stats']['expected'] == 10
shutil.copyfile(desktop / 'test-results' / 'ui-results.json', docs / 'BROWSER_TEST_RESULTS.json')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

screenshots = []
for path in sorted((docs / 'screenshots').glob('browser-*.png')):
    width, height = struct.unpack('>II', path.read_bytes()[16:24])
    assert (width, height) == (1440, 900)
    screenshots.append({'file': str(path.relative_to(repository)), 'width': width, 'height': height, 'source': 'Chrome component test, not native Mac', 'sha256': digest(path)})
assert len(screenshots) == 8
lock = json.loads((desktop / 'package-lock.json').read_text())
source_files = sorted(list((desktop / 'src').rglob('*.ts')) + list((desktop / 'src').rglob('*.tsx')) + list((desktop / 'src').rglob('*.css')) + list((desktop / 'src-tauri' / 'src').rglob('*.rs')))
source_hashes = {str(path.relative_to(repository)): digest(path) for path in source_files}
data = {
    'recordedAtUtc': datetime.now(timezone.utc).isoformat(),
    'version': bundle_info['CFBundleShortVersionString'],
    'identifier': bundle_info['CFBundleIdentifier'],
    'app': str(app), 'archive': str(archive),
    'appBytes': sum(path.stat().st_size for path in app.rglob('*') if path.is_file()),
    'executableSha256': digest(binary), 'archiveSha256': digest(archive),
    'signature': {'type': 'adhoc', 'strictVerification': 'passed', 'developerId': False, 'notarized': False},
    'architecture': 'arm64', 'nativeLinkedRuntime': 'system WebKit/AppKit; otool inspected',
    'staticAssets': {'productionDist': 'embedded', 'demoVideoKeyFoundInExecutable': True, 'demoDurationMs': 12000},
    'verification': {
        'typecheck': 'passed in final desktop build',
        'logicAndStartupTestsPassed': 16, 'rustRuleTestsPassed': 2,
        'browserTestsPassed': ui_results['stats']['expected'], 'widths': [1024, 1280, 1440, 1728],
        'nativeGui': 'NOT RUN - Mac locked; user requested remaining verification first',
        'finderLaunch': 'NOT RUN', 'nativeScreenshots': 'NOT AVAILABLE',
        'D3': 'NOT STARTED'
    },
    'npmVersions': {name: lock['packages']['node_modules/' + name]['version'] for name in ['react', 'react-dom', '@tauri-apps/api', '@tauri-apps/cli', 'typescript', 'vite', 'vitest', '@playwright/test']},
    'screenshots': screenshots, 'sourceSha256': source_hashes
}
(delivery / 'BUILD_MANIFEST.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
(delivery / 'SHA256SUMS.txt').write_text(f"{digest(archive)}  {archive.name}\n{digest(binary)}  逆向轻抖.app/Contents/MacOS/qingdou-workbench\n")
manifest_path = docs / 'CHANGED_FILES.md'
manifest_path.write_text('# 本轮新增文件\n\n初始为空仓库，无用户未提交修改。全部为本工程新增文件；没有改动外部插件/Python。依赖、工具链、构建产物和 ZIP 按 .gitignore 排除。Tauri 图标工具的自动输出不代表其他平台已实现或测试。\n\n')
files = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=repository).decode().split('\0')
with manifest_path.open('a') as output:
    for name in sorted(filter(None, files)):
        output.write('- `' + name + '`\n')
print(json.dumps({'appBytes': data['appBytes'], 'archiveSha256': data['archiveSha256'], 'screenshots': len(screenshots), 'uiTests': ui_results['stats']['expected'], 'nativeGui': 'pending'}, ensure_ascii=False))
