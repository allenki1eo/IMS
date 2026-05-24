#!/usr/bin/env node
/**
 * Tally → IMS Sync Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads vouchers and ledger balances from Tally's XML HTTP API (port 9000)
 * and pushes them to the IMS Tally sync endpoint.
 *
 * Optionally reads master data (ledgers, groups) from a Tally "All Masters"
 * XML export file when Tally's live API is unavailable or as a supplement.
 *
 * Usage:
 *   node index.js
 *   node index.js --config /path/to/config.json
 *   node index.js --master-file /path/to/Master.xml
 *   node index.js --master-only                         (skip live API, use file only)
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

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const configPath = getArg("--config") || path.join(__dirname, "config.json");
const masterFileArg = getArg("--master-file");
const masterOnly = args.includes("--master-only");

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
  masterFile: masterFileConfig,
} = config;

// --master-file CLI flag overrides config value
const masterFilePath = masterFileArg || masterFileConfig || null;

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

function extractAll(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "gi");
  const results = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

function extractFirst(xml, tag) {
  return extractAll(xml, tag)[0] ?? "";
}

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
 * Extract NAME attribute from a tag: <LEDGER NAME="Cash" ...>
 */
function extractNameAttr(tagOpenStr) {
  const match = /NAME\s*=\s*"([^"]*)"/.exec(tagOpenStr);
  return match ? match[1].trim() : "";
}

function parseTallyDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  if (/^\d{8}$/.test(dateStr)) {
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return new Date(`${y}-${m}-${d}`).toISOString();
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ─── Master File Reader ───────────────────────────────────────────────────────

/**
 * Read a Tally master XML file. Tally exports can be UTF-16 LE or UTF-8.
 * Auto-detects encoding by checking for the UTF-16 LE BOM (FF FE).
 */
function readMasterFile(filePath) {
  const buf = fs.readFileSync(filePath);

  // UTF-16 LE BOM: 0xFF 0xFE
  const isUtf16LE = buf[0] === 0xff && buf[1] === 0xfe;
  // UTF-16 BE BOM: 0xFE 0xFF
  const isUtf16BE = buf[0] === 0xfe && buf[1] === 0xff;

  if (isUtf16LE) {
    return buf.toString("utf16le");
  }
  if (isUtf16BE) {
    // Swap bytes and decode as utf16le
    const swapped = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length - 1; i += 2) {
      swapped[i] = buf[i + 1];
      swapped[i + 1] = buf[i];
    }
    return swapped.toString("utf16le");
  }

  // No BOM — try UTF-8, fall back to latin1
  const utf8 = buf.toString("utf8");
  // Heuristic: if the XML has many spaces between each char it may be
  // a mis-detected UTF-16 file without BOM
  if (utf8.match(/<\s[A-Z]\s[A-Z]/)) {
    // Looks like spaced-out UTF-16 read as UTF-8 without BOM — treat as UTF-16 LE
    return buf.toString("utf16le");
  }

  return utf8;
}

// ─── Code Generator ──────────────────────────────────────────────────────────

/**
 * Generate a short uppercase code from a name.
 * e.g. "Raw Material (Victoria)" → "RAW_MATERIAL_VICTORIA"
 */
function toCode(name, maxLen = 30) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
}

// ─── Parse Godowns (Warehouses) ───────────────────────────────────────────────

function parseMasterGodowns(xml) {
  const seen = new Set();
  const results = [];
  const blocks = extractBlocks(xml, "GODOWN");

  for (const block of blocks) {
    const openTag = block.match(/^<GODOWN([^>]*)>/i);
    const name = (openTag ? extractNameAttr(openTag[0]) : "") || extractFirst(block, "NAME");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    results.push({ name, code: toCode(name) });
  }
  return results;
}

// ─── Parse Units of Measure ───────────────────────────────────────────────────

function parseMasterUnits(xml) {
  const seen = new Set();
  const results = [];
  const blocks = extractBlocks(xml, "UNIT");

  for (const block of blocks) {
    const openTag = block.match(/^<UNIT([^>]*)>/i);
    const name = (openTag ? extractNameAttr(openTag[0]) : "") || extractFirst(block, "NAME");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    // Use the name itself as symbol (e.g. "KG", "Ltr", "PCS")
    results.push({ name, code: toCode(name, 20), symbol: name });
  }
  return results;
}

// ─── Parse Stock Groups (Item Categories) ────────────────────────────────────

function parseMasterStockGroups(xml) {
  const seen = new Set();
  const results = [];
  const blocks = extractBlocks(xml, "STOCKGROUP");

  for (const block of blocks) {
    const openTag = block.match(/^<STOCKGROUP([^>]*)>/i);
    const name = (openTag ? extractNameAttr(openTag[0]) : "") || extractFirst(block, "NAME");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const parent = extractFirst(block, "PARENT");
    results.push({ name, code: toCode(name, 30), parentName: parent || undefined });
  }
  return results;
}

// ─── Parse Stock Items ────────────────────────────────────────────────────────

/**
 * Determine IMS itemType from Tally stock group name.
 */
function itemTypeFromGroup(groupName) {
  if (!groupName) return "RAW_MATERIAL";
  const g = groupName.toLowerCase();
  if (g.includes("finished") || g.includes("9 -")) return "FINISHED_GOODS";
  if (g.includes("spare") || g.includes("8 -")) return "SPARE_PART";
  if (g.includes("store")) return "CONSUMABLE";
  return "RAW_MATERIAL";
}

function parseMasterStockItems(xml) {
  const seen = new Set();
  const results = [];
  const blocks = extractBlocks(xml, "STOCKITEM");

  for (const block of blocks) {
    const openTag = block.match(/^<STOCKITEM([^>]*)>/i);
    const name = (openTag ? extractNameAttr(openTag[0]) : "") || extractFirst(block, "NAME");
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const groupName = extractFirst(block, "PARENT");
    const uomName = extractFirst(block, "BASEUNITS");
    const code = toCode(name, 30);

    results.push({
      name,
      code,
      groupName: groupName || undefined,
      uomName: uomName || undefined,
      itemType: itemTypeFromGroup(groupName),
    });
  }
  return results;
}

// ─── Parse Ledgers from Master XML ───────────────────────────────────────────

/**
 * Parse LEDGER entries from a Tally "All Masters" XML export.
 * The name can appear as a NAME attribute on the tag OR as a <NAME> child element.
 */
function parseMasterLedgers(xml) {
  const ledgers = [];
  const seen = new Set();

  // LEDGER blocks inside TALLYMESSAGE
  const blocks = extractBlocks(xml, "LEDGER");

  for (const block of blocks) {
    // Try NAME attribute first, then <NAME> child
    const openTagMatch = block.match(/^<LEDGER([^>]*)>/i);
    const nameFromAttr = openTagMatch ? extractNameAttr(openTagMatch[0]) : "";
    const nameFromChild = extractFirst(block, "NAME");
    const name = nameFromAttr || nameFromChild;

    if (!name || seen.has(name)) continue;
    seen.add(name);

    const parent = extractFirst(block, "PARENT");
    const openingBalRaw = extractFirst(block, "OPENINGBALANCE");
    const closingBalRaw = extractFirst(block, "CLOSINGBALANCE");

    // Tally balances can have "Dr" / "Cr" suffixes or be negative for Cr
    const parseBalance = (raw) => {
      if (!raw) return 0;
      const cleaned = raw.replace(/[^0-9.\-]/g, "");
      return parseFloat(cleaned) || 0;
    };

    ledgers.push({
      name,
      group: parent || undefined,
      openingBal: Math.abs(parseBalance(openingBalRaw)),
      closingBal: Math.abs(parseBalance(closingBalRaw)),
      currency: "TZS",
    });
  }

  return ledgers;
}

/**
 * Parse GROUP entries from a Tally "All Masters" XML export.
 * Groups are returned alongside ledgers to give IMS the full account hierarchy.
 */
function parseMasterGroups(xml) {
  const groups = [];
  const seen = new Set();
  const blocks = extractBlocks(xml, "GROUP");

  for (const block of blocks) {
    const openTagMatch = block.match(/^<GROUP([^>]*)>/i);
    const nameFromAttr = openTagMatch ? extractNameAttr(openTagMatch[0]) : "";
    const nameFromChild = extractFirst(block, "NAME");
    const name = nameFromAttr || nameFromChild;

    if (!name || seen.has(name)) continue;
    seen.add(name);

    const parent = extractFirst(block, "PARENT");

    // Represent groups as zero-balance ledgers so IMS can build the hierarchy
    groups.push({
      name,
      group: parent || undefined,
      openingBal: 0,
      closingBal: 0,
      currency: "TZS",
      isGroup: true,
    });
  }

  return groups;
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

    const ledgerEntries = [];
    const entryBlocks = extractBlocks(block, "ALLLEDGERENTRIES.LIST")
      .concat(extractBlocks(block, "LEDGERENTRIES.LIST"));

    for (const entry of entryBlocks) {
      const ledger = extractFirst(entry, "LEDGERNAME");
      const amtRaw = extractFirst(entry, "AMOUNT");
      const amt = parseFloat(amtRaw) || 0;
      ledgerEntries.push({
        ledger,
        amount: Math.abs(amt),
        type: amt < 0 ? "CR" : "DR",
      });
    }

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

// ─── Parse Ledgers (from live API) ───────────────────────────────────────────

function parseLedgers(xml) {
  const ledgers = [];
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

// ─── Merge Ledgers (deduplicate by name, live API takes precedence) ───────────

function mergeLedgers(liveLedgers, masterLedgers) {
  const map = new Map();
  // Master file goes in first
  for (const l of masterLedgers) map.set(l.name, l);
  // Live API overwrites (fresher data)
  for (const l of liveLedgers) map.set(l.name, l);
  return Array.from(map.values());
}

// ─── Main Sync Logic ──────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[tally-sync] Starting sync at ${startedAt}`);
  if (!masterOnly) {
    console.log(`[tally-sync] Date range: ${FROM_DATE} → ${TO_DATE}`);
    console.log(`[tally-sync] Tally URL: ${tallyUrl}`);
  }
  console.log(`[tally-sync] IMS URL: ${imsUrl}`);
  if (masterFilePath) {
    console.log(`[tally-sync] Master file: ${masterFilePath}`);
  }
  if (masterOnly) {
    console.log(`[tally-sync] Mode: master-file only (skipping live Tally API)`);
  }

  let vouchers = [];
  let liveLedgers = [];
  let masterLedgers = [];
  let masterWarehouses = [];
  let masterUnits = [];
  let masterCategories = [];
  let masterStockItems = [];
  let voucherError = null;
  let ledgerError = null;

  // ── Read Master File (if configured) ────────────────────────────────────────
  if (masterFilePath) {
    if (!fs.existsSync(masterFilePath)) {
      console.error(`[tally-sync] Master file not found: ${masterFilePath}`);
      process.exit(1);
    }
    try {
      console.log("[tally-sync] Reading master file...");
      const xml = readMasterFile(masterFilePath);

      const ledgers    = parseMasterLedgers(xml);
      const groups     = parseMasterGroups(xml);
      const godowns    = parseMasterGodowns(xml);
      const units      = parseMasterUnits(xml);
      const stockGrps  = parseMasterStockGroups(xml);
      const stockItems = parseMasterStockItems(xml);

      masterLedgers    = [...ledgers, ...groups];
      masterWarehouses = godowns;
      masterUnits      = units;
      masterCategories = stockGrps;
      masterStockItems = stockItems;

      console.log(
        `[tally-sync] Master file parsed:` +
        `\n  Ledgers:     ${ledgers.length}` +
        `\n  Groups:      ${groups.length}` +
        `\n  Warehouses:  ${godowns.length}` +
        `\n  Units:       ${units.length}` +
        `\n  Categories:  ${stockGrps.length}` +
        `\n  Stock items: ${stockItems.length}`
      );
    } catch (err) {
      console.error(`[tally-sync] Failed to read master file: ${err.message}`);
      if (masterOnly) process.exit(1);
    }
  }

  // ── Fetch from Live Tally API (skip if --master-only) ───────────────────────
  if (!masterOnly) {
    console.log("[tally-sync] Fetching vouchers from Tally...");
    try {
      const res = await httpPost(tallyUrl, VOUCHER_XML);
      if (res.statusCode !== 200) throw new Error(`Tally returned HTTP ${res.statusCode}`);
      vouchers = parseVouchers(res.body);
      console.log(`[tally-sync] Parsed ${vouchers.length} vouchers`);
    } catch (err) {
      voucherError = err.message;
      console.error(`[tally-sync] Failed to fetch vouchers: ${err.message}`);
    }

    console.log("[tally-sync] Fetching ledgers from Tally...");
    try {
      const res = await httpPost(tallyUrl, LEDGER_XML);
      if (res.statusCode !== 200) throw new Error(`Tally returned HTTP ${res.statusCode}`);
      liveLedgers = parseLedgers(res.body);
      console.log(`[tally-sync] Parsed ${liveLedgers.length} ledgers from live API`);
    } catch (err) {
      ledgerError = err.message;
      console.error(`[tally-sync] Failed to fetch ledgers: ${err.message}`);
    }
  }

  // ── Merge ledgers (live API takes precedence over master file) ───────────────
  const ledgers = mergeLedgers(liveLedgers, masterLedgers);
  console.log(`[tally-sync] Total ledgers to sync: ${ledgers.length}`);

  const hasAnything =
    vouchers.length > 0 ||
    ledgers.length > 0 ||
    masterWarehouses.length > 0 ||
    masterUnits.length > 0 ||
    masterCategories.length > 0 ||
    masterStockItems.length > 0;

  if (!hasAnything) {
    const errorMsg = [voucherError, ledgerError].filter(Boolean).join("; ");
    console.error(`[tally-sync] Nothing to sync. ${errorMsg ? "Errors: " + errorMsg : "No data found."}`);

    try {
      await imsPost("/api/tally/sync", { companyId, vouchers: [], ledgers: [], triggeredBy: "agent" });
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
      warehouses:  masterWarehouses,
      units:       masterUnits,
      categories:  masterCategories,
      stockItems:  masterStockItems,
      triggeredBy: "agent",
    });

    if (res.statusCode === 200 || res.statusCode === 201) {
      const {
        vouchersIn   = 0,
        ledgersIn    = 0,
        warehousesIn = 0,
        unitsIn      = 0,
        categoriesIn = 0,
        stockItemsIn = 0,
      } = res.body?.data ?? {};
      console.log(
        `[tally-sync] Sync complete:` +
        `\n  Vouchers:    ${vouchersIn}` +
        `\n  Ledgers:     ${ledgersIn}` +
        `\n  Warehouses:  ${warehousesIn}` +
        `\n  Units:       ${unitsIn}` +
        `\n  Categories:  ${categoriesIn}` +
        `\n  Stock items: ${stockItemsIn}`
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
