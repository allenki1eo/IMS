#!/usr/bin/env node
/**
 * Tally → IMS Sync Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads vouchers and ledger balances from Tally's XML HTTP API (port 9000)
 * and pushes them to the IMS Tally sync endpoint.
 *
 * Usage:
 *   node index.js
 *   node index.js --config /path/to/config.json
 *
 * Run via cron (Linux):
 *   0 * * * * /usr/bin/node /path/to/tally-sync-agent/index.js >> /var/log/tally-sync.log 2>&1
 *
 * Run via Task Scheduler (Windows):
 *   Action: node.exe  Arguments: C:\path\to\tally-sync-agent\index.js
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const configFlagIdx = args.indexOf("--config");
const configPath =
  configFlagIdx !== -1 && args[configFlagIdx + 1]
    ? args[configFlagIdx + 1]
    : path.join(__dirname, "config.json");

if (!fs.existsSync(configPath)) {
  console.error(`[tally-sync] Config file not found: ${configPath}`);
  console.error(
    `[tally-sync] Copy config.example.json to config.json and fill in your settings.`
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const {
  tallyUrl = "http://localhost:9000",
  imsUrl,
  apiKey,
  companyId,
  syncIntervalDays = 7,
} = config;

if (!imsUrl || !apiKey || !companyId) {
  console.error("[tally-sync] Missing required config: imsUrl, apiKey, companyId");
  process.exit(1);
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function formatTallyDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

const toDate = new Date();
const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - Math.max(1, parseInt(syncIntervalDays, 10)));

const FROM_DATE = formatTallyDate(fromDate);
const TO_DATE = formatTallyDate(toDate);

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

/**
 * Make an HTTP/HTTPS POST request and return the response body as a string.
 */
function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const lib = isHttps ? https : http;
    const bodyBuf = Buffer.from(body, "utf8");

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Length": bodyBuf.length,
        ...headers,
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error("Request timed out after 30s"));
    });
    req.write(bodyBuf);
    req.end();
  });
}

/**
 * POST JSON to the IMS API.
 */
function imsPost(endpoint, payload) {
  const url = `${imsUrl.replace(/\/$/, "")}${endpoint}`;
  const body = JSON.stringify(payload);
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === "https:";
  const lib = isHttps ? https : http;
  const bodyBuf = Buffer.from(body, "utf8");

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": bodyBuf.length,
        Authorization: `Bearer ${apiKey}`,
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error("IMS request timed out after 60s"));
    });
    req.write(bodyBuf);
    req.end();
  });
}

// ─── Tally XML Requests ───────────────────────────────────────────────────────

const VOUCHER_XML = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVFROMDATE>${FROM_DATE}</SVFROMDATE>
          <SVTODATE>${TO_DATE}</SVTODATE>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

const LEDGER_XML = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

// ─── XML Parsing Helpers ──────────────────────────────────────────────────────

/**
 * Extract all occurrences of a tag's text content.
 * Returns an array of strings.
 */
function extractAll(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "gi");
  const results = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

/**
 * Extract first occurrence of a tag's text content.
 */
function extractFirst(xml, tag) {
  const results = extractAll(xml, tag);
  return results[0] ?? "";
}

/**
 * Extract all blocks matching a given wrapper tag.
 * E.g. extractBlocks(xml, "VOUCHER") → array of XML strings for each <VOUCHER>...</VOUCHER>
 */
function extractBlocks(xml, tag) {
  const blocks = [];
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  let pos = 0;
  while (pos < xml.length) {
    const start = xml.indexOf(openTag, pos);
    if (start === -1) break;
    const end = xml.indexOf(closeTag, start);
    if (end === -1) break;
    blocks.push(xml.slice(start, end + closeTag.length));
    pos = end + closeTag.length;
  }
  return blocks;
}

/**
 * Parse Tally date string (e.g. "20240115" or "15-Jan-2024") → ISO string.
 */
function parseTallyDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  // YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return new Date(`${y}-${m}-${d}`).toISOString();
  }
  // Try native parsing as fallback
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ─── Parse Vouchers ───────────────────────────────────────────────────────────

function parseVouchers(xml) {
  const vouchers = [];
  const blocks = extractBlocks(xml, "VOUCHER");

  for (const block of blocks) {
    const guid = extractFirst(block, "GUID");
    const voucherType = extractFirst(block, "VOUCHERTYPENAME");
    const voucherNumber = extractFirst(block, "VOUCHER.NUMBER") || extractFirst(block, "VOUCHERNUMBER");
    const dateRaw = extractFirst(block, "DATE");
    const narration = extractFirst(block, "NARRATION");
    const partyName = extractFirst(block, "PARTYNAME") || extractFirst(block, "PARTYLEDGERNAME");

    if (!guid && !voucherNumber) continue;

    // Parse ledger entries from ALLLEDGERENTRIES or LEDGERENTRIES blocks
    const ledgerEntries = [];
    const entryBlocks = extractBlocks(block, "ALLLEDGERENTRIES.LIST")
      .concat(extractBlocks(block, "LEDGERENTRIES.LIST"));

    for (const entry of entryBlocks) {
      const ledger = extractFirst(entry, "LEDGERNAME");
      const amtRaw = extractFirst(entry, "AMOUNT");
      const amt = parseFloat(amtRaw) || 0;
      // In Tally, negative amount = Credit, positive = Debit
      ledgerEntries.push({
        ledger,
        amount: Math.abs(amt),
        type: amt < 0 ? "CR" : "DR",
      });
    }

    // Total amount = sum of debit entries
    const amount = ledgerEntries
      .filter((e) => e.type === "DR")
      .reduce((sum, e) => sum + e.amount, 0);

    vouchers.push({
      tallyId: guid || voucherNumber,
      voucherType: voucherType || "Journal",
      voucherNumber: voucherNumber || guid || "",
      date: parseTallyDate(dateRaw),
      narration: narration || undefined,
      amount,
      currency: "TZS",
      partyName: partyName || undefined,
      ledgerEntries,
    });
  }

  return vouchers;
}

// ─── Parse Ledgers ────────────────────────────────────────────────────────────

function parseLedgers(xml) {
  const ledgers = [];

  // Try LEDGER blocks first, then GROUP blocks
  const blocks = extractBlocks(xml, "LEDGER");

  for (const block of blocks) {
    const name = extractFirst(block, "NAME");
    const parent = extractFirst(block, "PARENT");
    const openingBal = parseFloat(extractFirst(block, "OPENINGBALANCE")) || 0;
    const closingBal = parseFloat(extractFirst(block, "CLOSINGBALANCE")) || 0;

    if (!name) continue;

    ledgers.push({
      name,
      group: parent || undefined,
      openingBal: Math.abs(openingBal),
      closingBal: Math.abs(closingBal),
      currency: "TZS",
    });
  }

  return ledgers;
}

// ─── Main Sync Logic ──────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[tally-sync] Starting sync at ${startedAt}`);
  console.log(`[tally-sync] Date range: ${FROM_DATE} → ${TO_DATE}`);
  console.log(`[tally-sync] Tally URL: ${tallyUrl}`);
  console.log(`[tally-sync] IMS URL: ${imsUrl}`);

  let vouchers = [];
  let ledgers = [];
  let voucherError = null;
  let ledgerError = null;

  // ── Fetch Vouchers ──────────────────────────────────────────────────────────
  console.log("[tally-sync] Fetching vouchers from Tally...");
  try {
    const res = await httpPost(tallyUrl, VOUCHER_XML);
    if (res.statusCode !== 200) {
      throw new Error(`Tally returned HTTP ${res.statusCode}`);
    }
    vouchers = parseVouchers(res.body);
    console.log(`[tally-sync] Parsed ${vouchers.length} vouchers`);
  } catch (err) {
    voucherError = err.message;
    console.error(`[tally-sync] Failed to fetch vouchers: ${err.message}`);
  }

  // ── Fetch Ledgers ───────────────────────────────────────────────────────────
  console.log("[tally-sync] Fetching ledgers from Tally...");
  try {
    const res = await httpPost(tallyUrl, LEDGER_XML);
    if (res.statusCode !== 200) {
      throw new Error(`Tally returned HTTP ${res.statusCode}`);
    }
    ledgers = parseLedgers(res.body);
    console.log(`[tally-sync] Parsed ${ledgers.length} ledgers`);
  } catch (err) {
    ledgerError = err.message;
    console.error(`[tally-sync] Failed to fetch ledgers: ${err.message}`);
  }

  if (vouchers.length === 0 && ledgers.length === 0) {
    const errorMsg = [voucherError, ledgerError].filter(Boolean).join("; ");
    console.error(`[tally-sync] Nothing to sync. Errors: ${errorMsg}`);

    // Still report to IMS so the error is logged
    try {
      await imsPost("/api/tally/sync", {
        companyId,
        vouchers: [],
        ledgers: [],
        triggeredBy: "agent",
      });
    } catch (e) {
      console.error("[tally-sync] Failed to report error to IMS:", e.message);
    }
    process.exit(1);
  }

  // ── Push to IMS ─────────────────────────────────────────────────────────────
  console.log("[tally-sync] Pushing data to IMS...");
  try {
    const res = await imsPost("/api/tally/sync", {
      companyId,
      vouchers,
      ledgers,
      triggeredBy: "agent",
    });

    if (res.statusCode === 200 || res.statusCode === 201) {
      const { vouchersIn = 0, ledgersIn = 0 } = res.body?.data ?? {};
      console.log(
        `[tally-sync] Sync complete. Vouchers: ${vouchersIn}, Ledgers: ${ledgersIn}`
      );
    } else {
      const errMsg =
        typeof res.body === "object" ? res.body?.error ?? JSON.stringify(res.body) : res.body;
      console.error(`[tally-sync] IMS returned HTTP ${res.statusCode}: ${errMsg}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[tally-sync] Failed to push data to IMS: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[tally-sync] Unhandled error:", err.message);
  process.exit(1);
});
