"""
DEPRECATED — DO NOT RUN.

This script used to pre-seed the diagnoses table with fake rows for demo purposes.
The Outbreak Radar now uses REAL data only.

Real data is written when:
  - A farmer uploads a crop photo  → POST /api/diagnose  (Gemini Vision)
  - TF.js runs on-device inference → POST /api/diagnose-log (edge AI)

To reset the database: DELETE FROM diagnoses; (via SQLite)
"""

print("❌ This seed script is disabled. The Outbreak Radar uses real data only.")
print("   Diagnoses are written by POST /api/diagnose and POST /api/diagnose-log.")
