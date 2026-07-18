#!/usr/bin/env python3
"""Audit and optionally synchronize the three plugin distribution layers."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

AUDIT_OK = 0
DRIFT_FOUND = 1
USAGE_OR_IO_ERROR = 2
SCOPES = ("skills", ".claude-plugin", "agents", "commands", "hooks")
ROOT_FILES = ("SKILL.md", "CHANGELOG.md")
EXCLUDED_SEGMENTS = {".serena", "scripts", "node_modules", ".git"}
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULTS = {
    "src": PROJECT_ROOT / "arthurpower",
    "mkt": Path("~/.claude/plugins/marketplaces/arthurpower-local/plugins/arthurpower/"),
    "cache": Path("~/.claude/plugins/cache/arthurpower-local/arthurpower/0.7.0/"),
}


@dataclass(frozen=True)
class Layers:
    src: Path
    mkt: Path
    cache: Path


def resolve_path(value: str, base: Path) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else (base / path).resolve()


def env_or_default(primary: str, alternate: str, fallback: Path) -> str:
    return os.environ.get(primary) or os.environ.get(alternate) or str(fallback)


PLUGIN_ID = "arthurpower@arthurpower-local"


def _discover_cache_path() -> Path | None:
    config_path = Path("~/.claude/plugins/installed_plugins.json").expanduser()
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        return None
    entries = data.get("plugins", {}).get(PLUGIN_ID)
    if not isinstance(entries, list) or not entries:
        return None
    chosen = None
    for entry in entries:
        if isinstance(entry, dict) and entry.get("scope") == "user":
            chosen = entry
            break
    if chosen is None:
        for entry in entries:
            if isinstance(entry, dict):
                chosen = entry
                break
    if chosen is None:
        return None
    install_path = chosen.get("installPath")
    if not install_path:
        return None
    return Path(install_path)


def _discover_installed_version() -> str | None:
    config_path = Path("~/.claude/plugins/installed_plugins.json").expanduser()
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        return None
    entries = data.get("plugins", {}).get(PLUGIN_ID)
    if not isinstance(entries, list) or not entries:
        return None
    for entry in entries:
        if isinstance(entry, dict) and entry.get("scope") == "user":
            version = entry.get("version")
            if isinstance(version, str):
                return version
            return None
    for entry in entries:
        if isinstance(entry, dict):
            version = entry.get("version")
            if isinstance(version, str):
                return version
            return None
    return None


def _read_plugin_json_version(path: Path) -> str | None:
    candidate = path / ".claude-plugin" / "plugin.json"
    try:
        data = json.loads(candidate.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        return None
    version = data.get("version")
    return version if isinstance(version, str) else None


def collect_layer(root: Path) -> dict[str, Path]:
    files: dict[str, Path] = {}
    for scope in SCOPES:
        scope_root = root / scope
        if not scope_root.is_dir():
            continue
        for path in scope_root.rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(root)
            if any(segment in EXCLUDED_SEGMENTS for segment in relative.parts):
                continue
            parent_parts = relative.parts[:-1]
            if any(part.startswith(".") and part != ".claude-plugin" for part in parent_parts):
                continue
            files[relative.as_posix()] = path
    for fname in ROOT_FILES:
        path = root / fname
        if path.is_file():
            files[fname] = path
    return files


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def audit(layers: Layers) -> list[str]:
    file_maps = [collect_layer(root) for root in (layers.src, layers.mkt, layers.cache)]
    relative_paths = set().union(*(file_map.keys() for file_map in file_maps))
    drifted: list[str] = []
    for relative in sorted(relative_paths):
        hashes = [
            sha256_file(file_map[relative]) if relative in file_map else "MISSING"
            for file_map in file_maps
        ]
        if len(set(hashes)) != 1:
            drifted.append(relative)
            print(
                f"[DRIFT] {relative} src={hashes[0]} mkt={hashes[1]} cache={hashes[2]}"
            )
    return drifted


def sync_drifted(layers: Layers, drifted: list[str]) -> None:
    source_files = collect_layer(layers.src)
    for relative in drifted:
        source = source_files.get(relative)
        if source is None:
            continue
        for destination_root in (layers.mkt, layers.cache):
            destination = destination_root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Audit or synchronize src, marketplace, and cache plugin layers. "
            "Sync never deletes destination-only files."
        )
    )
    parser.add_argument("mode", nargs="?", choices=("audit", "sync"), default="audit")
    parser.add_argument("--src", default=env_or_default("SYNC_SRC", "SRC", DEFAULTS["src"]))
    parser.add_argument("--mkt", default=env_or_default("SYNC_MKT", "MKT", DEFAULTS["mkt"]))
    parser.add_argument(
        "--cache",
        default=env_or_default(
            "SYNC_CACHE",
            "CACHE",
            _discover_cache_path() or DEFAULTS["cache"],
        ),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    layers = Layers(
        resolve_path(args.src, PROJECT_ROOT),
        resolve_path(args.mkt, PROJECT_ROOT),
        resolve_path(args.cache, PROJECT_ROOT),
    )
    try:
        drifted = audit(layers)
        if args.mode == "sync":
            sync_drifted(layers, drifted)
            drifted = audit(layers)
    except OSError as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        return USAGE_OR_IO_ERROR
    src_version = _read_plugin_json_version(layers.src)
    installed_version = _discover_installed_version()
    if src_version is not None and installed_version is not None and src_version != installed_version:
        print(
            f"[WARN] plugin.json={src_version} but installed={installed_version}",
            file=sys.stderr,
        )
    elif src_version is not None and installed_version is None:
        print(
            f"[WARN] plugin.json={src_version} but installed=<unknown>",
            file=sys.stderr,
        )
    return DRIFT_FOUND if drifted else AUDIT_OK


if __name__ == "__main__":
    sys.exit(main())
