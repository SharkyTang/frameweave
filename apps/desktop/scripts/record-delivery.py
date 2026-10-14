"""Inspect the D2 bundle and attach recorded native evidence, without launching GUI."""
import hashlib
import json
import plistlib
import shutil
import struct
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

desktop = Path(__file__).resolve().parents[1]
repository = desktop.parents[1]
delivery = repository / 'deliverables' / 'D2'
docs = repository / 'docs' / 'desktop-workbench'
app = delivery / 'FrameWeave.app'
archive = delivery / 'FrameWeave-D2-mac-arm64.zip'
binary = app / 'Contents' / 'MacOS' / 'frameweave-workbench'
bundle_info = plistlib.loads((app / 'Contents' / 'Info.plist').read_bytes())
assert bundle_info['CFBundleIdentifier'] == 'com.sharkytang.frameweave.workbench'
assert bundle_info['CFBundleShortVersionString'] == '0.1.0'
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
architecture = subprocess.check_output(['file', str(binary)], text=True).strip()
assert 'arm64' in architecture
assert b'demo/three-scenes.mp4' in binary.read_bytes(), 'Bundled demo asset key is missing'
assert (desktop / 'dist' / 'demo' / 'three-scenes.mp4').stat().st_size > 0
assert (desktop / 'dist' / 'demo' / 'three-scenes.mp4').read_bytes() == (desktop / 'public' / 'demo' / 'three-scenes.mp4').read_bytes()
with zipfile.ZipFile(archive) as packed:
    assert packed.testzip() is None, 'ZIP integrity failed'
    # ditto's legacy ZIP flags accompany UTF-8 names in this Mac archive.
    entries = {(entry.filename if entry.flag_bits & 0x800 else entry.filename.encode('cp437').decode('utf-8')): entry for entry in packed.infolist()}
    for path in app.rglob('*'):
        if path.is_file():
            name = str(path.relative_to(app.parent))
            assert packed.read(entries[name]) == path.read_bytes(), f'ZIP does not match app: {name}'
ui_results = json.loads((desktop / 'test-results' / 'ui-results.json').read_text())
assert ui_results['stats']['unexpected'] == 0
assert ui_results['stats']['expected'] == 10
shutil.copyfile(desktop / 'test-results' / 'ui-results.json', docs / 'BROWSER_TEST_RESULTS.json')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def jpeg_size(path):
    data = path.read_bytes()
    assert data.startswith(b'\xff\xd8'), f'Not a JPEG: {path}'
    pos = 2
    while pos < len(data):
        assert data[pos] == 0xff, f'Invalid JPEG marker: {path}'
        while data[pos] == 0xff:
            pos += 1
        marker = data[pos]
        pos += 1
        if marker in [0x01, 0xd8] or 0xd0 <= marker <= 0xd7:
            continue
        assert marker not in [0xd9, 0xda], f'JPEG has no frame size: {path}'
        length = struct.unpack('>H', data[pos:pos + 2])[0]
        assert length >= 2 and pos + length <= len(data)
        if marker in [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]:
            height, width = struct.unpack('>HH', data[pos + 3:pos + 7])
            assert width > 0 and height > 0
            return width, height
        pos += length
    raise ValueError(f'JPEG size not found: {path}')

native_path = docs / 'NATIVE_TEST_RESULTS.json'
native_results = json.loads(native_path.read_text())
assert native_results['standaloneLaunch']['status'] == 'passed'
assert native_results['D3'] == 'NOT STARTED'
screenshots = []
for path in sorted((docs / 'screenshots').glob('browser-*.png')):
    raw = path.read_bytes()
    assert raw.startswith(b'\x89PNG\r\n\x1a\n')
    width, height = struct.unpack('>II', raw[16:24])
    assert (width, height) == (1440, 900)
    screenshots.append({'file': str(path.relative_to(repository)), 'width': width, 'height': height, 'source': 'Chrome component test, not native Mac', 'sha256': digest(path)})
assert len(screenshots) == 8
final_native = set(native_results['screenshots']['finalBundleNames'])
for name in final_native:
    assert (docs / 'screenshots' / name).is_file(), f'Missing final native screenshot: {name}'
native_screenshots = sorted((docs / 'screenshots').glob('desktop-*.jpg'))
assert len(list((docs / 'screenshots').glob('desktop-min-*.jpg'))) == 8
for path in native_screenshots:
    width, height = jpeg_size(path)
    screenshots.append({
        'file': str(path.relative_to(repository)), 'width': width, 'height': height,
        'dimensions': 'image pixels, not logical window size',
        'source': 'real Mac Tauri/WKWebView window captured by native CUA',
        'captureBuild': 'FrameWeave rebrand' if path.name in final_native else 'unspecified',
        'sha256': digest(path)
    })
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
    'archiveContentsMatchApp': True,
    'signature': {'type': 'adhoc', 'strictVerification': 'passed', 'developerId': False, 'notarized': False},
    'architecture': 'arm64', 'nativeLinkedRuntime': 'system WebKit/AppKit; otool inspected',
    'staticAssets': {'productionDist': 'embedded', 'demoVideoKeyFoundInExecutable': True, 'demoDurationMs': 12000},
    'verification': {
        'typecheck': 'passed in final desktop build',
        'logicAndStartupTestsPassed': 16, 'rustRuleTestsPassed': 2,
        'browserTestsPassed': ui_results['stats']['expected'], 'browserWidths': [1024, 1280, 1440, 1728],
        'nativeGui': native_results['nativeGui'],
        'finderLaunch': native_results['finderLaunch'],
        'standaloneLaunch': native_results['standaloneLaunch'],
        'nativeWidthsObserved': [1024, 1512],
        'nativeScreenshots': len(native_screenshots),
        'nativeResultsFile': str(native_path.relative_to(repository)),
        'nativeResultsSha256': digest(native_path),
        'partialNativeChecks': native_results['partial'],
        'nativeChecksNotRun': native_results['notRun'],
        'D3': 'NOT STARTED'
    },
    'npmVersions': {name: lock['packages']['node_modules/' + name]['version'] for name in ['react', 'react-dom', '@tauri-apps/api', '@tauri-apps/cli', 'typescript', 'vite', 'vitest', '@playwright/test']},
    'screenshots': screenshots, 'sourceSha256': source_hashes
}
(delivery / 'BUILD_MANIFEST.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
(delivery / 'SHA256SUMS.txt').write_text(f"{digest(archive)}  {archive.name}\n{digest(binary)}  FrameWeave.app/Contents/MacOS/frameweave-workbench\n")
manifest_path = docs / 'CHANGED_FILES.md'
manifest_path.write_text('# D2 工程文件清单\n\nD0 开始时为空仓库，无旧文件或用户未提交修改；本轮建立独立桌面包。执行中新增的 AGENTS.md、远端配置和已有暂存内容均保留，本轮没有重新暂存、提交或推送。以下包含 Git 可见的已暂存和未暂存文件，不代表均由同一次操作创建；没有改动外部插件/Python。依赖、工具链、构建产物和 ZIP 按 .gitignore 排除。Tauri 图标自动输出不代表其他平台已实现或测试。\n\n')
files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=repository).decode().split('\0')
with manifest_path.open('a') as output:
    for name in sorted(name for name in set(filter(None, files)) if (repository / name).is_file()):
        output.write('- `' + name + '`\n')
print(json.dumps({'appBytes': data['appBytes'], 'archiveSha256': data['archiveSha256'], 'screenshots': len(screenshots), 'nativeScreenshots': len(native_screenshots), 'uiTests': ui_results['stats']['expected'], 'nativeGui': data['verification']['nativeGui'], 'standaloneLaunch': data['verification']['standaloneLaunch']['status']}, ensure_ascii=False))
