"""Verify this finite evidence packet with Python's standard library only."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys


def regular(path, directory=False):
    info = path.lstat()
    if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 1024:
        raise ValueError("Linked/reparse path is not allowed")
    if not (stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)):
        raise ValueError("Unexpected file type")


def anchored(root):
    root = root.absolute()
    for parent in reversed((root, *root.parents)):
        regular(parent, directory=True)
    return root


def checked_path(root, name):
    if not isinstance(name, str) or "\\" in name or ":" in name:
        raise ValueError("Invalid relative path")
    parsed = PurePosixPath(name)
    if parsed.is_absolute() or not name or name != parsed.as_posix() or ".." in parsed.parts:
        raise ValueError("Invalid relative path")
    reserved = {"CON", "PRN", "AUX", "NUL", *("COM" + str(n) for n in range(1, 10)),
                *("LPT" + str(n) for n in range(1, 10))}
    if any(part.endswith((".", " ")) or part.split(".")[0].upper() in reserved for part in parsed.parts):
        raise ValueError("Windows-ambiguous relative path")
    target = root
    for part in parsed.parts[:-1]:
        target = target / part
        regular(target, directory=True)
    target = target / parsed.name
    regular(target)
    return target


def bind(root, rows):
    names = set()
    for row in rows:
        name = row["path"]
        if name in names:
            raise ValueError("Duplicate manifest path")
        names.add(name)
        raw = checked_path(root, name).read_bytes()
        if len(raw) != row["bytes"] or hashlib.sha256(raw).hexdigest() != row["sha256"]:
            raise ValueError("Byte mismatch: " + name)
    return names


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path,
                        help="Additionally check all 102 source files, with the explicit HANDOFF successor")
    args = parser.parse_args()
    root = anchored(Path(__file__).parent)
    manifest = json.loads(checked_path(root, "manifest.json").read_text(encoding="utf-8"))
    expected = bind(root, manifest["files"]) | {"manifest.json"}
    actual = set()
    for base, dirs, files in os.walk(root, followlinks=False):
        for name in dirs:
            regular(Path(base) / name, directory=True)
        for name in files:
            path = Path(base) / name
            regular(path)
            actual.add(path.relative_to(root).as_posix())
    if expected != actual:
        raise ValueError("Packet path set mismatch")
    source_count = 0
    if args.source_root:
        bindings = json.loads(checked_path(root, "source-bindings.json").read_text(encoding="utf-8"))
        source_count = len(bind(anchored(args.source_root), bindings["proposedPublicationFiles"]))
    print(json.dumps({"status": "PASS", "packetFiles": len(actual),
                      "sourceFiles": source_count,
                      "claim": "Byte custody only; no test, visual, Git, shared CI or release certification."}))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}), file=sys.stderr)
        sys.exit(1)
