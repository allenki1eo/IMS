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

### 3. Run Manually

```bash
node index.js
```

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
| Ledger balances | List of Accounts | Upsert by ledger name |

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
