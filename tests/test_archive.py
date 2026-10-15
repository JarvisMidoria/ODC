import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('archive', Path(__file__).parents[1] / 'scripts/archive-legacy-data.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ArchiveTest(unittest.TestCase):
    def test_archive_preserves_wal_legacy_tables_and_exports_only_public_statuses(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / 'source.sqlite'
            connection = sqlite3.connect(source)
            connection.execute('PRAGMA journal_mode=WAL')
            connection.execute('CREATE TABLE legacy_users (id INTEGER PRIMARY KEY, secret TEXT)')
            connection.execute("INSERT INTO legacy_users VALUES(42,'hash-and-private-data')")
            connection.execute('CREATE TABLE product_status_overrides (product_id TEXT, status TEXT)')
            connection.execute("INSERT INTO product_status_overrides VALUES('fabric','unavailable')")
            connection.execute('CREATE TABLE old_unknown_table (value BLOB)')
            connection.execute("INSERT INTO old_unknown_table VALUES(x'010203')")
            connection.commit()
            before = connection.execute('SELECT * FROM legacy_users').fetchall()
            destination = Path(temporary) / 'archive'
            module.archive(source, destination, 'local')
            self.assertEqual(before, connection.execute('SELECT * FROM legacy_users').fetchall())
            restored = sqlite3.connect((destination / 'legacy.sqlite').as_uri() + '?mode=ro', uri=True)
            self.assertEqual(restored.execute('SELECT * FROM legacy_users').fetchall(), before)
            self.assertEqual(restored.execute('SELECT value FROM old_unknown_table').fetchone()[0], b'\x01\x02\x03')
            self.assertEqual(restored.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
            manifest = json.loads((destination / 'manifest.json').read_text())
            self.assertEqual(manifest['source'], 'local')
            self.assertEqual(manifest['tables']['legacy_users']['rows'], 1)
            self.assertEqual(manifest['sha256'], hashlib.sha256((destination / 'legacy.sqlite').read_bytes()).hexdigest())
            statuses = json.loads((destination / 'catalog-statuses.json').read_text())
            self.assertEqual(statuses['statuses'], [{'productId': 'fabric', 'status': 'unavailable'}])
            self.assertNotIn('hash-and-private-data', (destination / 'catalog-statuses.json').read_text())
            self.assertEqual((destination / 'legacy.sqlite').stat().st_mode & 0o777, 0o600)
            self.assertEqual(destination.stat().st_mode & 0o777, 0o700)
            with self.assertRaises(FileExistsError):
                module.archive(source, destination, 'local')
            restored.close()
            connection.close()


if __name__ == '__main__':
    unittest.main()
