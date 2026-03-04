# Position Data Backup & Recovery

## Overview

Visual position overrides are stored in Cloudflare KV (`POSITIONS` namespace). KV data is **not versioned by default** — if overwritten, previous data is lost.

## Backup

### Manual Backup (curl)

Export all position data as a single JSON file:

```bash
curl https://specs.venterradev.com/api/positions/export > positions-backup-$(date +%Y%m%d).json
```

### Per-Page with Metadata

Fetch a single page's positions with timestamp metadata:

```bash
curl "https://specs.venterradev.com/api/positions/homepage?meta=true"
```

Response:
```json
{
  "data": { ... },
  "updated_at": "2026-02-27T15:30:00.000Z",
  "page": "homepage"
}
```

### Bulk Export Response Format

`GET /api/positions/export` returns:

```json
{
  "exported_at": "2026-03-04T12:00:00.000Z",
  "total_pages": 11,
  "entries": {
    "homepage": { "data": { ... }, "updated_at": "..." },
    "amenities": { "data": { ... }, "updated_at": "..." }
  }
}
```

## Recommended Schedule

Run the backup command weekly or before any major spec changes. Store backups in a `backups/` directory (gitignored) or in a shared drive.

## Recovery

There is no automated restore endpoint. To restore, use the existing PUT endpoint per page:

```bash
# Extract a page's data from a backup and PUT it back
jq '.entries.homepage.data' positions-backup-20260304.json | \
  curl -X PUT -H "Content-Type: application/json" \
  -d @- https://specs.venterradev.com/api/positions/homepage
```
