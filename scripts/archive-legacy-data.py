#!/usr/bin/env python3
"""Make a private, consistent SQLite archive, including every legacy table and WAL writes.

Never deletes or modifies the source. A local archive is not a production backup.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sqlite3
from datetime import datetime, timezone


def quote(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def archive(database, output, source):
    database = database.resolve(strict=True)
    output = output.resolve()
    root = Path(__file__).resolve().parents[1]
    for public in [root / 'public', root / 'dist', root / '.vercel', root / 'src']:
        if output == public or public in output.parents:
            raise ValueError('The archive must not be written into a public or deployed directory.')
    output.mkdir(parents=True, mode=0o700, exist_ok=False)
    os.chmod(output, 0o700)
    original = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)
    target_path = output / 'legacy.sqlite'
    target = sqlite3.connect(target_path)
    try:
        original.backup(target)
        # Make the archive standalone: no missing -wal/-shm files on another machine.
        target.execute('PRAGMA journal_mode=DELETE')
    finally:
        original.close()
        target.close()
    os.chmod(target_path, 0o600)
    backup = sqlite3.connect(target_path.as_uri() + '?mode=ro', uri=True)
    backup.row_factory = sqlite3.Row
    try:
        integrity = backup.execute('PRAGMA integrity_check').fetchone()[0]
        if integrity != 'ok':
            raise RuntimeError('Database integrity check failed. Archive retained for recovery.')
        tables = [row[0] for row in backup.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        manifest = {
            'source': source,
            'captured_at_utc': datetime.now(timezone.utc).isoformat(),
            'database_file': 'legacy.sqlite',
            'bytes': target_path.stat().st_size,
            'sha256': hashlib.sha256(target_path.read_bytes()).hexdigest(),
            'integrity_check': integrity,
            'foreign_key_violations': len(backup.execute('PRAGMA foreign_key_check').fetchall()),
            'tables': {},
        }
        for table in tables:
            manifest['tables'][table] = {
                'rows': backup.execute('SELECT COUNT(*) FROM ' + quote(table)).fetchone()[0],
                'columns': [row['name'] for row in backup.execute('PRAGMA table_info(' + quote(table) + ')')],
            }
        statuses = {'source': source, 'captured_at_utc': manifest['captured_at_utc'], 'statuses': [], 'colorwayStatuses': []}
        if 'product_status_overrides' in tables:
            statuses['statuses'] = [
                {'productId': row['product_id'], 'status': row['status']}
                for row in backup.execute('SELECT product_id,status FROM product_status_overrides ORDER BY product_id')
                if row['status'] in ('available', 'unavailable')
            ]
        if 'product_colorway_status_overrides' in tables:
            statuses['colorwayStatuses'] = [
                {'productId': row['product_id'], 'colorwayId': row['colorway_id'], 'status': row['status']}
                for row in backup.execute('SELECT product_id,colorway_id,status FROM product_colorway_status_overrides ORDER BY product_id,colorway_id')
                if row['status'] in ('available', 'unavailable')
            ]
        for name, data in [('manifest.json', manifest), ('catalog-statuses.json', statuses)]:
            file = output / name
            file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
            os.chmod(file, 0o600)
        print(json.dumps({'archive': str(output), 'source': source, 'integrity_check': integrity,
                          'tables': len(tables), 'total_rows': sum(item['rows'] for item in manifest['tables'].values())}))
    finally:
        backup.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, required=True, help='SQLite database, including its adjacent WAL if present')
    parser.add_argument('--output', type=Path, required=True, help='New private folder, usually data/archives/<date>')
    parser.add_argument('--source', choices=['local', 'render-production'], required=True)
    args = parser.parse_args()
    archive(args.database, args.output, args.source)
