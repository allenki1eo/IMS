# IMS TallyPrime Sync Agent

This folder contains a local Node.js agent that connects to TallyPrime on your office computer and sends accounting data to IMS.

The sync is one-way:

```text
TallyPrime on your local PC -> IMS ERP
```

The agent reads data from Tally through the TallyPrime XML HTTP API. It does not create, edit, delete, or post anything back into Tally.

## What It Syncs

| IMS data | Tally source | Default report |
| --- | --- | --- |
| Vouchers | Voucher/day book XML | `DayBook` |
| Ledger balances | Ledger/account XML | `List of Accounts` |
| Ledgers + Groups | All Masters XML file (`masterFile`) | — |
| Warehouses (Godowns) | All Masters XML file | — |
| Units of Measure | All Masters XML file | — |
| Stock Groups (Categories) | All Masters XML file | — |
| Stock Items | All Masters XML file | — |

The agent follows the same XML API shape documented in `NoumaanAhamed/tally-prime-api-docs`: POST XML to `http://localhost:9000`, use `Content-Type: text/xml`, export reports with `TALLYREQUEST` set to `Export Data`, and pass dates as `YYYYMMDD`.

## Requirements

Install or confirm these on the computer where TallyPrime runs:

1. TallyPrime is installed.
2. The target company is open/loaded in TallyPrime.
3. Tally is enabled as a local XML/HTTP server on port `9000`.
4. Node.js 16 or newer is installed.
5. IMS is deployed and reachable from this computer.
6. You have an IMS Tally API key.

## Step 1: Enable TallyPrime Local Server

On the Tally computer:

1. Open TallyPrime.
2. Open the company you want to sync.
3. Go to configuration/settings.
4. Enable Tally as a server. Depending on your TallyPrime version this may appear as:
   - `F12 > Configure > Data Synchronization > Set as Server`
   - or `F12 > Advanced Configuration > Enable ODBC/HTTP Server`
   - or `Gateway of Tally > F12 > Product & Features > Enable TallyPrime Server`
5. Set the server port to:

```text
9000
```

6. Keep TallyPrime open while the sync agent runs.

## Step 2: Test Tally Locally

Open PowerShell on the same computer and run:

```powershell
Invoke-WebRequest -Uri http://localhost:9000 -Method Post -ContentType "text/xml" -Body '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Trial Balance</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>'
```

Expected result:

- You should receive XML containing `<ENVELOPE>`.
- If the request fails, Tally is not listening on port `9000`, the company is not loaded, or a firewall is blocking local traffic.

## Step 3: Generate IMS API Key

In IMS:

1. Log in as an admin.
2. Go to `Finance > Tally Sync`.
3. Open the `API Keys` area.
4. Create a new key, for example:

```text
Tally Office PC
```

5. Copy the plain key immediately. IMS will only show it once.
6. Copy your IMS company ID from the same Tally Sync screen if it is shown there.

## Step 4: Configure The Agent

On the Tally computer, copy this folder somewhere permanent, for example:

```text
C:\IMS\tally-sync-agent
```

Create your config:

```powershell
cd C:\IMS\tally-sync-agent
copy config.example.json config.json
notepad config.json
```

Example `config.json`:

```json
{
  "tallyUrl": "http://localhost:9000",
  "imsUrl": "https://your-ims-app.vercel.app",
  "apiKey": "paste-your-api-key-here",
  "companyId": "paste-your-company-id-here",
  "syncIntervalDays": 7,
  "currency": "TZS",
  "voucherReportName": "DayBook",
  "ledgerReportName": "List of Accounts",
  "syncVouchers": true,
  "syncLedgers": true,
  "includeRawXml": false,
  "dumpTallyXml": false,
  "requestTimeoutMs": 60000,
  "masterFile": ""
}
```

Configuration notes:

| Setting | Meaning |
| --- | --- |
| `tallyUrl` | Local Tally XML server URL. Usually `http://localhost:9000`. |
| `imsUrl` | Your deployed IMS base URL. Do not include a trailing slash. |
| `apiKey` | Key generated in IMS `Finance > Tally Sync`. |
| `companyId` | IMS company ID that owns the Tally data. |
| `syncIntervalDays` | How many days back to fetch vouchers when no date flags are used. |
| `currency` | Currency code stored in IMS for synced values. |
| `voucherReportName` | Tally report used for vouchers. Default: `DayBook`. |
| `ledgerReportName` | Tally report used for ledgers. Default: `List of Accounts`. |
| `syncVouchers` | Set to `false` to skip voucher sync. |
| `syncLedgers` | Set to `false` to skip ledger sync. |
| `includeRawXml` | Stores voucher raw XML in IMS. Use only if needed. |
| `dumpTallyXml` | Writes raw Tally responses to local `logs/` for debugging. |
| `requestTimeoutMs` | Timeout for Tally and IMS HTTP requests. |
| `masterFile` | Path to a Tally "All Masters" XML export for seeding master data (optional). |

## Step 4b: Import Master Data From Tally (Optional)

The `masterFile` option lets you import your full company master data — ledgers, groups, warehouses (godowns), units of measure, stock groups, and stock items — from a Tally "All Masters" XML export.

**How to export the Master file from Tally:**

1. Open Tally → Gateway of Tally
2. Go to **Display > List of Accounts** (or **Alt+F1** to expand)
3. Press **Alt+E** (Export)
4. Format: **XML**
5. Save the file, e.g. `C:\IMS\Master.xml`

Set the path in `config.json`:

```json
{
  "masterFile": "C:\\IMS\\Master.xml"
}
```

Or pass it on the command line:

```powershell
node index.js --master-file C:\IMS\Master.xml
```

To import from the master file **only** (no live Tally connection needed — useful for offline or one-time imports):

```powershell
node index.js --master-file C:\IMS\Master.xml --master-only
```

## Step 5: Test The Agent Against Tally

Run:

```powershell
node index.js --test
```

Expected output:

```text
[tally-sync] Testing Tally XML server: http://localhost:9000
[tally-sync] Tally responded with ... characters of XML.
[tally-sync] Local Tally connection test passed.
```

If this fails, fix Tally before testing IMS. The most common causes are:

- TallyPrime is closed.
- No company is loaded.
- Port `9000` is not enabled.
- Another application is using port `9000`.
- Windows Firewall or antivirus is blocking local server access.

## Step 6: Dry Run A Sync

Run this before sending anything to IMS:

```powershell
node index.js --dry-run --dump-xml
```

The agent will:

1. Export vouchers from Tally.
2. Export ledgers from Tally.
3. Parse them.
4. Print counts.
5. Save raw XML in `logs/`.
6. Send nothing to IMS.

You can also test a specific date range:

```powershell
node index.js --dry-run --from 2026-05-01 --to 2026-05-23
```

or:

```powershell
node index.js --dry-run --from 20260501 --to 20260523
```

## Step 7: Run The Real Sync

When the dry run looks correct:

```powershell
node index.js
```

Expected output (with master file):

```text
[tally-sync] Starting at ...
[tally-sync] Tally URL: http://localhost:9000
[tally-sync] Date range: 20260516 -> 20260523
[tally-sync] Master file: C:\IMS\Master.xml
[tally-sync] Reading master file...
[tally-sync] Master file parsed:
  Ledgers:     713
  Groups:      45
  Warehouses:  7
  Units:       10
  Categories:  13
  Stock items: 518
[tally-sync] Exporting DayBook from Tally...
[tally-sync] Parsed 42 vouchers
[tally-sync] Exporting List of Accounts from Tally...
[tally-sync] Parsed 156 ledgers from live API
[tally-sync] Total ledgers to sync: 758
[tally-sync] Pushing data to IMS...
[tally-sync] Sync complete:
  Vouchers:    42
  Ledgers:     758
  Warehouses:  7
  Units:       10
  Categories:  13
  Stock items: 518
```

In IMS, open:

```text
Finance > Tally Sync
```

Check:

- latest sync log
- vouchers
- ledgers

## Step 8: Schedule Automatic Sync On Windows

Create this folder if it does not exist:

```powershell
mkdir C:\IMS\logs
```

Create a file:

```text
C:\IMS\run-tally-sync.bat
```

Contents:

```batch
@echo off
cd /d C:\IMS\tally-sync-agent
node index.js >> C:\IMS\logs\tally-sync.log 2>&1
```

Then:

1. Open Windows Task Scheduler.
2. Click `Create Basic Task`.
3. Name it `IMS Tally Sync`.
4. Choose a schedule, for example every hour.
5. Action: `Start a program`.
6. Program/script:

```text
C:\IMS\run-tally-sync.bat
```

7. Finish.
8. Right-click the task and choose `Run` to test it.

## Step 9: Troubleshooting

| Error | Meaning | Fix |
| --- | --- | --- |
| `ECONNREFUSED` | Tally is not accepting connections. | Open Tally, load company, enable server on port `9000`. |
| `Tally response did not look like XML` | The endpoint is not the Tally XML server. | Confirm `tallyUrl` and port. |
| `Nothing to sync` | Tally returned no vouchers or ledgers. | Run with `--dump-xml` and check `logs/`. Confirm date range has entries. |
| `Invalid or inactive API key` | IMS rejected the key. | Generate a new key in IMS and update `config.json`. |
| `API key does not belong to this company` | `companyId` does not match the key. | Copy the correct company ID from IMS. |
| `IMS returned HTTP 500` | IMS accepted the request but failed while saving. | Check IMS deployment logs and Supabase schema. |
| `Master file not found` | Path in `masterFile` or `--master-file` flag is wrong. | Check the path and use an absolute path. |
| `Master file parsed 0 ledgers` | File is not an "All Masters" export. | Re-export from Tally: Display > List of Accounts > Alt+E > XML. |
| `Garbled characters in master parse` | Encoding was not detected correctly. | Re-export from Tally with UTF-8 encoding selected. |
| Some vouchers missing | The selected Tally report may not expose them. | Try widening the date range or changing `voucherReportName`. |

## Useful Commands

Test local Tally only:

```powershell
node index.js --test
```

Dry run with XML dump:

```powershell
node index.js --dry-run --dump-xml
```

Sync a specific range:

```powershell
node index.js --from 2026-05-01 --to 2026-05-23
```

Import master data only (no live Tally needed):

```powershell
node index.js --master-file C:\IMS\Master.xml --master-only
```

Use another config file:

```powershell
node index.js --config C:\IMS\tally-sync-agent\config.production.json
```

## Notes From The TallyPrime XML API Flow

- Tally must be configured as a server before external tools can read reports.
- The target company must be loaded in TallyPrime.
- Dates should be sent as `YYYYMMDD`.
- XML requests are sent as `POST` with `Content-Type: text/xml`.
- Report export requests use `TALLYREQUEST` = `Export Data`.
- Tally import/log files are useful when the XML request succeeds but report data is missing.

Reference docs:

- https://github.com/NoumaanAhamed/tally-prime-api-docs/
- https://github.com/NoumaanAhamed/tally-prime-api-docs/blob/main/workflow.md
