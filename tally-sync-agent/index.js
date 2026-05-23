#!/usr/bin/env node
/**
 * Tally -> IMS Sync Agent
 *
 * One-way bridge from a local TallyPrime XML HTTP server to IMS.
 * The agent reads Tally reports over http://localhost:9000 and pushes the
 * parsed data to /api/tally/sync in IMS. It never writes data back to Tally.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const args = process.argv.slice(2);

function readFlag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function hasFlag(name) {
  return args.includes(name);
}

const configPath = readFlag("--config") || path.join(__dirname, "config.json");

if (!fs.existsSync(configPath)) {
  console.error(`[tally-sync] Config file not found: ${configPath}`);
  console.error("[tally-sync] Copy config.example.json to config.json and fill in your settings.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const tallyUrl = config.tallyUrl || "http://localhost:9000";
const imsUrl = config.imsUrl;
const apiKey = config.apiKey;
const companyId = config.companyId;
const syncIntervalDays = Number(config.syncIntervalDays || 7);
const voucherReportName = config.voucherReportName || "DayBook";
const ledgerReportName = config.ledgerReportName || "List of Accounts";
const currency = config.currency || "TZS";
const requestTimeoutMs = Number(config.requestTimeoutMs || 60000);
const includeRawXml = Boolean(config.includeRawXml);
const syncVouchers = config.syncVouchers !== false;
const syncLedgers = config.syncLedgers !== false;
const dumpTallyXml = Boolean(config.dumpTallyXml || hasFlag("--dump-xml"));
const dryRun = Boolean(hasFlag("--dry-run"));
const testOnly = Boolean(hasFlag("--test"));

if (!testOnly && (!imsUrl || !apiKey || !companyId)) {
  console.error("[tally-sync] Missing required config: imsUrl, apiKey, companyId");
  process.exit(1);
}

function formatTallyDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getDateRange() {
  const toArg = readFlag("--to") || config.toDate;
  const fromArg = readFlag("--from") || config.fromDate;

  const to = toArg ? parseInputDate(toArg) : new Date();
  const from = fromArg ? parseInputDate(fromArg) : new Date(to);
  if (!fromArg) from.setDate(from.getDate() - Math.max(1, syncIntervalDays));

  return {
    fromDate: formatTallyDate(from),
    toDate: formatTallyDate(to),
  };
}

function parseInputDate(value) {
  if (/^\d{8}$/.test(value)) {
    return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD or YYYYMMDD.`);
  }
  return date;
}

const { fromDate: FROM_DATE, toDate: TO_DATE } = getDateRange();

function httpRequest(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const lib = isHttps ? https : http;
    const bodyBuf = Buffer.from(body, "utf8");

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Length": bodyBuf.length,
        ...headers,
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on("error", reject);
    req.setTimeout(requestTimeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${requestTimeoutMs}ms`));
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
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": bodyBuf.length,
        Authorization: `Bearer ${apiKey}`,
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(requestTimeoutMs, () => {
      req.destroy(new Error(`IMS request timed out after ${requestTimeoutMs}ms`));
    });
    req.write(bodyBuf);
    req.end();
  });
}

function exportDataXml(reportName, variables = {}) {
  const staticVariables = Object.entries(variables)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `          <${key}>${escapeXml(String(value))}</${key}>`)
    .join("\n");

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${escapeXml(reportName)}</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
${staticVariables}
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagPattern(tag) {
  return tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAll(xml, tag) {
  const regex = new RegExp(`<${tagPattern(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagPattern(tag)}>`, "gi");
  const results = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(decodeXml(match[1]));
  }
  return results;
}

function extractFirst(xml, tag) {
  return extractAll(xml, tag)[0] || "";
}

function extractAttribute(block, tag, attr) {
  const regex = new RegExp(`<${tagPattern(tag)}\\b[^>]*\\b${tagPattern(attr)}="([^"]*)"`, "i");
  const match = block.match(regex);
  return match ? decodeXml(match[1]) : "";
}

function extractBlocks(xml, tag) {
  const blocks = [];
  const openTag = new RegExp(`<${tagPattern(tag)}(?:\\s[^>]*)?>`, "gi");
  let match;
  while ((match = openTag.exec(xml)) !== null) {
    const start = match.index;
    const closeTag = `</${tag}>`;
    const end = xml.indexOf(closeTag, openTag.lastIndex);
    if (end === -1) continue;
    blocks.push(xml.slice(start, end + closeTag.length));
    openTag.lastIndex = end + closeTag.length;
  }
  return blocks;
}

function parseTallyDate(value) {
  if (!value) return new Date().toISOString();
  if (/^\d{8}$/.test(value)) {
    return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function parseAmount(value) {
  if (!value) return 0;
  const raw = decodeXml(value);
  const isNegative = raw.includes("-") || /^\s*\(.*\)\s*$/.test(raw);
  const numeric = raw.replace(/[^0-9.]/g, "");
  const amount = Number.parseFloat(numeric || "0");
  return isNegative ? -amount : amount;
}

function normalizeVoucherType(value) {
  return value || "Journal";
}

function parseVouchers(xml) {
  const vouchers = [];
  const blocks = extractBlocks(xml, "VOUCHER");

  for (const block of blocks) {
    const guid = extractFirst(block, "GUID");
    const masterId = extractFirst(block, "MASTERID");
    const alterId = extractFirst(block, "ALTERID");
    const voucherType = normalizeVoucherType(extractFirst(block, "VOUCHERTYPENAME"));
    const voucherNumber =
      extractFirst(block, "VOUCHER.NUMBER") ||
      extractFirst(block, "VOUCHERNUMBER") ||
      extractFirst(block, "REFERENCE") ||
      masterId ||
      guid;
    const dateRaw = extractFirst(block, "DATE") || extractFirst(block, "EFFECTIVEDATE");
    const narration = extractFirst(block, "NARRATION");
    const partyName =
      extractFirst(block, "PARTYNAME") ||
      extractFirst(block, "PARTYLEDGERNAME") ||
      extractFirst(block, "BASICBUYERNAME");

    if (!guid && !voucherNumber && !masterId) continue;

    const ledgerEntries = [];
    const entryBlocks = [
      ...extractBlocks(block, "ALLLEDGERENTRIES.LIST"),
      ...extractBlocks(block, "LEDGERENTRIES.LIST"),
    ];

    for (const entry of entryBlocks) {
      const ledger = extractFirst(entry, "LEDGERNAME");
      const rawAmount = extractFirst(entry, "AMOUNT");
      const amount = parseAmount(rawAmount);
      if (!ledger && amount === 0) continue;
      ledgerEntries.push({
        ledger,
        amount: Math.abs(amount),
        type: amount < 0 ? "CR" : "DR",
      });
    }

    const debitTotal = ledgerEntries
      .filter((entry) => entry.type === "DR")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const creditTotal = ledgerEntries
      .filter((entry) => entry.type === "CR")
      .reduce((sum, entry) => sum + entry.amount, 0);

    vouchers.push({
      tallyId: guid || masterId || `${voucherType}-${voucherNumber}-${dateRaw}`,
      voucherType,
      voucherNumber: voucherNumber || guid || masterId || "",
      date: parseTallyDate(dateRaw),
      narration: narration || undefined,
      amount: debitTotal || creditTotal,
      currency,
      partyName: partyName || undefined,
      ledgerEntries,
      rawXml: includeRawXml ? block : undefined,
      sourceMeta: { masterId, alterId },
    });
  }

  return vouchers;
}

function parseLedgers(xml) {
  const ledgers = [];
  const blocks = extractBlocks(xml, "LEDGER");

  for (const block of blocks) {
    const name = extractAttribute(block, "LEDGER", "NAME") || extractFirst(block, "NAME");
    const parent = extractFirst(block, "PARENT") || extractFirst(block, "GROUP");
    const openingBal = parseAmount(extractFirst(block, "OPENINGBALANCE"));
    const closingBal = parseAmount(extractFirst(block, "CLOSINGBALANCE"));

    if (!name) continue;

    ledgers.push({
      name,
      group: parent || undefined,
      openingBal: Math.abs(openingBal),
      closingBal: Math.abs(closingBal),
      currency,
    });
  }

  return ledgers;
}

function writeDump(name, xml) {
  if (!dumpTallyXml) return;
  const outDir = path.join(__dirname, "logs");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${name}.xml`);
  fs.writeFileSync(file, xml, "utf8");
  console.log(`[tally-sync] Wrote raw Tally XML: ${file}`);
}

async function fetchTallyReport(name, xml) {
  const res = await httpRequest(tallyUrl, xml);
  if (res.statusCode !== 200) {
    throw new Error(`Tally returned HTTP ${res.statusCode}`);
  }
  if (!res.body || !res.body.includes("<ENVELOPE")) {
    throw new Error("Tally response did not look like XML. Check that TallyPrime is running as server and a company is loaded.");
  }
  writeDump(name, res.body);
  return res.body;
}

async function testTallyConnection() {
  console.log(`[tally-sync] Testing Tally XML server: ${tallyUrl}`);
  const trialBalanceXml = exportDataXml("Trial Balance");
  const xml = await fetchTallyReport("trial-balance-test", trialBalanceXml);
  console.log(`[tally-sync] Tally responded with ${xml.length} characters of XML.`);
  console.log("[tally-sync] Local Tally connection test passed.");
}

async function main() {
  console.log(`[tally-sync] Starting at ${new Date().toISOString()}`);
  console.log(`[tally-sync] Tally URL: ${tallyUrl}`);
  console.log(`[tally-sync] Date range: ${FROM_DATE} -> ${TO_DATE}`);

  if (testOnly) {
    await testTallyConnection();
    return;
  }

  const vouchers = [];
  const ledgers = [];
  const errors = [];

  if (syncVouchers) {
    console.log(`[tally-sync] Exporting ${voucherReportName} from Tally...`);
    try {
      const xml = await fetchTallyReport(
        "vouchers",
        exportDataXml(voucherReportName, {
          SVFROMDATE: FROM_DATE,
          SVTODATE: TO_DATE,
        })
      );
      vouchers.push(...parseVouchers(xml));
      console.log(`[tally-sync] Parsed ${vouchers.length} vouchers`);
    } catch (err) {
      errors.push(`vouchers: ${err.message}`);
      console.error(`[tally-sync] Voucher export failed: ${err.message}`);
    }
  }

  if (syncLedgers) {
    console.log(`[tally-sync] Exporting ${ledgerReportName} from Tally...`);
    try {
      const xml = await fetchTallyReport("ledgers", exportDataXml(ledgerReportName));
      ledgers.push(...parseLedgers(xml));
      console.log(`[tally-sync] Parsed ${ledgers.length} ledgers`);
    } catch (err) {
      errors.push(`ledgers: ${err.message}`);
      console.error(`[tally-sync] Ledger export failed: ${err.message}`);
    }
  }

  if (dryRun) {
    console.log("[tally-sync] Dry run enabled. Nothing will be sent to IMS.");
    console.log(JSON.stringify({ vouchers: vouchers.length, ledgers: ledgers.length, errors }, null, 2));
    return;
  }

  if (vouchers.length === 0 && ledgers.length === 0) {
    throw new Error(`Nothing to sync. ${errors.join("; ") || "No Tally records were returned."}`);
  }

  console.log(`[tally-sync] Pushing ${vouchers.length} vouchers and ${ledgers.length} ledgers to IMS...`);
  const res = await imsPost("/api/tally/sync", {
    companyId,
    vouchers,
    ledgers,
    triggeredBy: "agent",
  });

  if (res.statusCode !== 200 && res.statusCode !== 201) {
    const errorBody = typeof res.body === "object" ? res.body?.error || JSON.stringify(res.body) : res.body;
    throw new Error(`IMS returned HTTP ${res.statusCode}: ${errorBody}`);
  }

  const { vouchersIn = 0, ledgersIn = 0 } = res.body?.data || {};
  console.log(`[tally-sync] Sync complete. Vouchers: ${vouchersIn}, Ledgers: ${ledgersIn}`);

  if (errors.length > 0) {
    console.warn(`[tally-sync] Completed with warnings: ${errors.join("; ")}`);
  }
}

main().catch((err) => {
  console.error(`[tally-sync] Failed: ${err.message}`);
  process.exit(1);
});
