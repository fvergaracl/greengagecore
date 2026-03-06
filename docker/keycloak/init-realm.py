#!/usr/bin/env python3
"""
Keycloak realm init script.

Reads the base realm-export.json and, if KC_DEV_ADMIN_PASSWORD is set,
injects a dev admin user with all realm roles before writing the result
to the shared volume that Keycloak imports from.
"""
import json
import os
import sys

INPUT = "/input/realm-export.json"
OUTPUT = "/output/realm-export.json"

with open(INPUT) as f:
    realm = json.load(f)

password = os.environ.get("KC_DEV_ADMIN_PASSWORD", "").strip()
# KC_DEV_ADMIN_PASSWORD=devadmin/devadmin@greencrowd.dev
user_email = os.environ.get("KC_DEV_ADMIN_EMAIL", "").strip()


if password and user_email:
    realm_roles = [r["name"] for r in realm.get("roles", {}).get("realm", [])]
    dev_user = {
        "username": user_email,
        "email": user_email,
        "firstName": "Dev",
        "lastName": "Admin",
        "enabled": True,
        "emailVerified": True,
        "credentials": [{"type": "password", "value": password, "temporary": False}],
        "realmRoles": realm_roles,
        "clientRoles": {},
    }
    realm.setdefault("users", []).append(dev_user)
    print(f"[init-realm] Dev admin user injected with roles: {realm_roles}", flush=True)
else:
    print("[init-realm] KC_DEV_ADMIN_PASSWORD not set — skipping dev user", flush=True)

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
with open(OUTPUT, "w") as f:
    json.dump(realm, f, indent=2)

print(f"[init-realm] Realm written to {OUTPUT}", flush=True)
sys.exit(0)
