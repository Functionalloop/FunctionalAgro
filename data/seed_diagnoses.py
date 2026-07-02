"""
Pre-seed SQLite diagnoses table with 3 Tomato Late Blight rows for pincode 560001.
This makes the Outbreak Radar fire reliably on stage when the demo submission adds the 4th case.

Run once before demo: python data/seed_diagnoses.py
"""
import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "functionalagro.db")

SEED_ROWS = [
    ("560001", "Tomato", "Late Blight", 0.92, (datetime.now() - timedelta(days=5)).isoformat()),
    ("560001", "Tomato", "Late Blight", 0.87, (datetime.now() - timedelta(days=3)).isoformat()),
    ("560001", "Tomato", "Late Blight", 0.91, (datetime.now() - timedelta(days=1)).isoformat()),
    # Extra row for Potato Early Blight to make the map look interesting
    ("411001", "Potato", "Early Blight", 0.85, (datetime.now() - timedelta(days=2)).isoformat()),
    ("411001", "Potato", "Early Blight", 0.89, (datetime.now() - timedelta(days=4)).isoformat()),
    ("411001", "Potato", "Early Blight", 0.83, (datetime.now() - timedelta(days=6)).isoformat()),
]

def seed():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS diagnoses (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            pincode   TEXT NOT NULL,
            crop      TEXT NOT NULL,
            disease   TEXT NOT NULL,
            confidence REAL NOT NULL,
            timestamp  TEXT NOT NULL
        )
    """)

    cur.executemany(
        "INSERT INTO diagnoses (pincode, crop, disease, confidence, timestamp) VALUES (?, ?, ?, ?, ?)",
        SEED_ROWS
    )
    conn.commit()
    conn.close()

    print(f"✅ Seeded {len(SEED_ROWS)} diagnosis rows into {DB_PATH}")
    print()
    print("Seeded data:")
    for row in SEED_ROWS:
        print(f"  📍 Pincode {row[0]} | {row[1]} | {row[2]} | {int(row[3]*100)}% confidence | {row[4][:10]}")
    print()
    print("⚡ Outbreak Radar will fire when a live 'Tomato Late Blight' diagnosis for 560001 is submitted on stage!")

if __name__ == "__main__":
    seed()
