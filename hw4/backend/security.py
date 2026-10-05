"""Password hashing for Campus Customs accounts (Problem 4).

Uses PBKDF2-HMAC-SHA256 from Python's standard library (hashlib), the same
algorithm the seeded users in data/campus_customs.db were created with.

Stored formats in users.password_hash:
  pbkdf2_sha256$<iterations>$<salt>$<hex digest>   new accounts (self-describing)
  pbkdf2_sha256$<salt>$<hex digest>                 seeded accounts (legacy)

The legacy format omits the iteration count; it was confirmed to be 120,000
by checking the seeded test account's hash. Plaintext passwords are never stored.
"""

import hashlib
import hmac
import secrets

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 600_000  # OWASP 2023 recommendation for PBKDF2-HMAC-SHA256
LEGACY_ITERATIONS = 120_000  # iteration count used by the seeded 3-part hashes


def _pbkdf2(password: str, salt: str, iterations: int) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations).hex()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    return f"{ALGORITHM}${ITERATIONS}${salt}${_pbkdf2(password, salt, ITERATIONS)}"


def verify_password(password: str, stored_hash: str) -> bool:
    parts = stored_hash.split("$")
    if parts[0] != ALGORITHM:
        return False
    if len(parts) == 4 and parts[1].isdigit():
        iterations, salt, expected = int(parts[1]), parts[2], parts[3]
    elif len(parts) == 3:
        iterations, salt, expected = LEGACY_ITERATIONS, parts[1], parts[2]
    else:
        return False
    return hmac.compare_digest(_pbkdf2(password, salt, iterations), expected)


# Verified against when an email isn't found, so unknown emails take about as
# long as wrong passwords and response timing doesn't reveal which accounts exist.
DUMMY_HASH = hash_password(secrets.token_hex(16))
