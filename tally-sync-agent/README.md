# Tally Sync Agent

A standalone Node.js script that syncs vouchers and ledger balances from Tally accounting software into the IMS ERP system.

## Requirements

- Node.js 16 or later (no npm install required — uses only built-in modules)
- Tally running on the local machine with the XML HTTP Server enabled on port 9000
- An IMS API key (generate one in Finance > Tally Sync > API Keys)

## Setup

### 1. Enable Tally XML HTTP Server

In Tally, go to:
**F12 (Configure) > Advanced Configuration > Enable ODBC Server**: Yes
**Port**: 9000

Or via Gateway of Tally > F12 > Product & Features > Enable TallyPrime Server.

### 2. Configure the Agent

```bash
cp config.example.json config.json
```

Edit `config.json`:

```json
{
  "tallyUrl": "http://localhost:9000",
  "imsUrl": "https://your-ims-app.vercel.app",
  "apiKey": "paste-your-api-key-here",
  "companyId": "paste-your-company-id-here",
  "syncIntervalDays": 7
}
```

- **tallyUrl**: URL of the Tally XML server (default: `http://localhost:9000`)
- **imsUrl**: Base URL of your IMS deployment
- **apiKey**: API key generated from IMS Finance > Tally Sync > API Keys tab
- **companyId**: Your company ID from IMS (shown in Finance > Tally Sync > Overview)
- **syncIntervalDays**: How many days back to fetch vouchers (default: 7)
- **masterFile**: *(optional)* Path to a Tally "All Masters" XML export file — used to seed ledger/group data when the live API is unavailable or as a one-time import

### 3. Run Manually

```bash
node index.js
```

#### Run with a Master XML file

To import ledgers and groups from a Tally "All Masters" export alongside the live sync:

```bash
node index.js --master-file /path/to/Master.xml
```

To import from the master file **only** (no live Tally API needed — useful for one-time imports or when Tally is offline):

```bash
node index.js --master-file /path/to/Master.xml --master-only
```

You can also set the path permanently in `config.json`:

```json
{
  "masterFile": "C:\\Tally\\Exports\\Master.xml"
}
```

**How to export the Master file from Tally:**
1. Open Tally → Gateway of Tally
2. Go to **Display > List of Accounts**
3. Press **Alt+E** (Export)
4. Format: **XML**
5. Save the file and point `masterFile` at it

Output:
```
[tally-sync] Starting sync at 2024-01-15T10:00:00.000Z
[tally-sync] Date range: 20240108 → 20240115
[tally-sync] Fetching vouchers from Tally...
[tally-sync] Parsed 42 vouchers
[tally-sync] Fetching ledgers from Tally...
[tally-sync] Parsed 156 ledgers
[tally-sync] Pushing data to IMS...
[tally-sync] Sync complete. Vouchers: 42, Ledgers: 156
```

### 4. Schedule Automatic Sync

#### Linux / macOS (cron)

Run every hour:
```bash
crontab -e
```
Add:
```
0 * * * * /usr/bin/node /path/to/tally-sync-agent/index.js >> /var/log/tally-sync.log 2>&1
```

Run every 15 minutes:
```
*/15 * * * * /usr/bin/node /path/to/tally-sync-agent/index.js >> /var/log/tally-sync.log 2>&1
```

#### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily or on a schedule of your choice
4. Action: Start a program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\path\to\tally-sync-agent\index.js`
   - Start in: `C:\path\to\tally-sync-agent\`
5. Finish

Alternatively, use a `.bat` file:
```batch
@echo off
node C:\path\to\tally-sync-agent\index.js >> C:\logs\tally-sync.log 2>&1
```

## What Gets Synced

| Data | Tally Source | Sync Behaviour |
|------|-------------|----------------|
| Vouchers (Journal, Payment, Receipt, Purchase) | Voucher Register (last N days) | Upsert by Tally GUID |
| Ledger balances | List of Accounts (live API) | Upsert by ledger name |
| Ledgers + Groups | All Masters XML file (`masterFile`) | Upsert by name; live API takes precedence if both present |

The sync is **one-way: Tally → IMS**. No data is written back to Tally.

## Viewing Synced Data

In IMS, navigate to **Finance > Tally Sync** to view:
- Sync logs (last 20 runs)
- All synced vouchers (filterable by type and date)
- All synced ledgers with opening/closing balances

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` connecting to Tally | Check that Tally is running and the XML server is enabled on port 9000 |
| `Invalid or inactive API key` | Regenerate the API key in IMS Finance > Tally Sync > API Keys |
| `401 Unauthorized` from IMS | Check that `apiKey` in config.json matches the key shown in IMS |
| No vouchers parsed | Tally may use a different XML structure; check the raw response by adding a `console.log(res.body)` after `httpPost` |
| `Company not configured` | Check that `companyId` in config.json is the correct ID from IMS |
| `Master file not found` | Check the path in `masterFile` config or `--master-file` flag |
| Master file parsed 0 ledgers | The file may have no `<LEDGER>` blocks — confirm it is an "All Masters" export, not a vouchers-only export |
| Garbled characters in master parse | The file encoding was not detected correctly; try re-exporting from Tally with UTF-8 encoding selected |
