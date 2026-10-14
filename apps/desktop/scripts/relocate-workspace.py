"""Move this verified workspace to the user-confirmed FrameWeave sibling directory."""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--destination', type=Path, required=True)
parser.add_argument('--previous-identifier', required=True)
parser.add_argument('--backup-dir', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[3]
destination = args.destination.resolve()
assert destination == root.parent / 'FrameWeave'
assert not destination.exists(), 'Destination exists; nothing has been moved'
assert (root / '.git').is_dir(), 'Expected ordinary repository directory'
assert re.fullmatch(r'com\.sharkytang\.[a-z0-9.]+', args.previous_identifier)
assert args.previous_identifier != 'com.sharkytang.frameweave.workbench'
backup = args.backup_dir.resolve()
assert backup.parent == Path('/private/tmp') and backup.name.startswith('frameweave-rebrand-') and backup.is_dir()
manifest = json.loads((root / 'deliverables/D2/BUILD_MANIFEST.json').read_text())
assert manifest['identifier'] == 'com.sharkytang.frameweave.workbench'
assert manifest['verification']['standaloneLaunch']['status'] == 'passed'
assert manifest['verification']['browserTestsPassed'] == 10
assert manifest['signature']['strictVerification'] == 'passed'
subprocess.run(['git', 'diff', '--check'], cwd=root, check=True)
retired = []
for category in ['Caches', 'WebKit']:
    source = Path.home() / 'Library' / category / args.previous_identifier
    if source.exists():
        target = backup / 'system-state-before-rebrand' / category / source.name
        assert not target.exists(), 'Backup destination exists'
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(target))
        retired.append(category)
root.rename(destination)
native_path = destination / 'docs/desktop-workbench/NATIVE_TEST_RESULTS.json'
native = json.loads(native_path.read_text())
native['workspaceRoot'] = str(destination)
native['workspaceRelocation'] = {'status': 'completed', 'method': 'directory rename; repository and local changes retained', 'previousSystemStateArchived': retired}
native_path.write_text(json.dumps(native, ensure_ascii=False, indent=2) + '\n')
subprocess.run([sys.executable, str(destination / 'apps/desktop/scripts/record-delivery.py')], cwd=destination, check=True)
print(json.dumps({'workspace': str(destination), 'identifier': manifest['identifier']}, ensure_ascii=False))
