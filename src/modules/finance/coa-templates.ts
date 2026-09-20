/**
 * Chart of Accounts bootstrap templates for the Finance CoA wizard.
 * No schema change — uses existing Account (+ optional BankAccount stubs).
 */

export type CoaAccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface CoaTemplateAccount {
  code: string;
  name: string;
  accountType: CoaAccountType;
  description?: string;
}

export interface CoaBankStub {
  name: string;
  accountType: "CASH" | "BANK";
  currency: string;
  bankName?: string;
}

export interface CoaTemplate {
  id: string;
  name: string;
  description: string;
  accounts: CoaTemplateAccount[];
  bankStubs: CoaBankStub[];
}

/** Brewery + Spirits Tanzania SME — full starter CoA (≥15 accounts). */
export const BREWERY_SPIRITS_TZ_SME: CoaTemplate = {
  id: "brewery-spirits-tz-sme",
  name: "Brewery + Spirits TZ SME",
  description:
    "Starter chart for a Tanzania brewery/spirits SME: cash & bank, inventory, AR/AP, VAT & excise stubs, equity, beer/spirits sales, COGS and operating expenses.",
  accounts: [
    // Assets
    { code: "1000", name: "Cash on Hand", accountType: "ASSET", description: "Petty cash and till" },
    { code: "1010", name: "Bank - Operating", accountType: "ASSET", description: "Primary operating bank account" },
    { code: "1100", name: "Accounts Receivable", accountType: "ASSET", description: "Trade debtors" },
    { code: "1200", name: "Inventory - Raw Materials", accountType: "ASSET" },
    { code: "1210", name: "Inventory - Finished Goods", accountType: "ASSET" },
    { code: "1220", name: "Inventory - Packaging", accountType: "ASSET" },
    // Liabilities
    { code: "2000", name: "Accounts Payable", accountType: "LIABILITY", description: "Trade creditors" },
    { code: "2100", name: "VAT Payable", accountType: "LIABILITY", description: "Output VAT stub (TZ)" },
    { code: "2110", name: "Excise Duty Payable", accountType: "LIABILITY", description: "Excise stub for beer/spirits" },
    { code: "2200", name: "Accrued Expenses", accountType: "LIABILITY" },
    // Equity
    { code: "3000", name: "Share Capital", accountType: "EQUITY" },
    { code: "3100", name: "Retained Earnings", accountType: "EQUITY" },
    // Revenue
    { code: "4000", name: "Beer Sales", accountType: "REVENUE" },
    { code: "4100", name: "Spirits Sales", accountType: "REVENUE" },
    { code: "4200", name: "Other Income", accountType: "REVENUE" },
    // COGS / Expenses
    { code: "5000", name: "COGS - Beer", accountType: "EXPENSE" },
    { code: "5100", name: "COGS - Spirits", accountType: "EXPENSE" },
    { code: "6000", name: "Salaries & Wages", accountType: "EXPENSE" },
    { code: "6100", name: "Utilities", accountType: "EXPENSE" },
    { code: "6200", name: "Rent & Premises", accountType: "EXPENSE" },
    { code: "6300", name: "Transport & Logistics", accountType: "EXPENSE" },
    { code: "6400", name: "Repairs & Maintenance", accountType: "EXPENSE" },
    { code: "6500", name: "Office & Admin", accountType: "EXPENSE" },
  ],
  bankStubs: [
    { name: "Cash on Hand", accountType: "CASH", currency: "TZS" },
    { name: "Bank - Operating", accountType: "BANK", currency: "TZS", bankName: "Primary Bank" },
  ],
};

/** Lean CoA — core control accounts only. */
export const MINIMAL_COA: CoaTemplate = {
  id: "minimal",
  name: "Minimal",
  description:
    "Lean starter chart: cash, bank, inventory, AR/AP, tax payable, equity, sales, COGS, and basic expenses.",
  accounts: [
    { code: "1000", name: "Cash on Hand", accountType: "ASSET" },
    { code: "1010", name: "Bank - Operating", accountType: "ASSET" },
    { code: "1100", name: "Accounts Receivable", accountType: "ASSET" },
    { code: "1200", name: "Inventory", accountType: "ASSET" },
    { code: "2000", name: "Accounts Payable", accountType: "LIABILITY" },
    { code: "2100", name: "Tax / Excise Payable", accountType: "LIABILITY", description: "Combined tax stub" },
    { code: "3000", name: "Owner Equity", accountType: "EQUITY" },
    { code: "4000", name: "Sales Revenue", accountType: "REVENUE" },
    { code: "5000", name: "Cost of Goods Sold", accountType: "EXPENSE" },
    { code: "6000", name: "Operating Expenses", accountType: "EXPENSE" },
  ],
  bankStubs: [
    { name: "Cash on Hand", accountType: "CASH", currency: "TZS" },
    { name: "Bank - Operating", accountType: "BANK", currency: "TZS", bankName: "Primary Bank" },
  ],
};

export const COA_TEMPLATES: CoaTemplate[] = [BREWERY_SPIRITS_TZ_SME, MINIMAL_COA];

export function getCoaTemplate(id: string): CoaTemplate | undefined {
  return COA_TEMPLATES.find((t) => t.id === id);
}

export function summarizeTemplate(template: CoaTemplate) {
  const byType: Record<string, number> = {};
  for (const a of template.accounts) {
    byType[a.accountType] = (byType[a.accountType] ?? 0) + 1;
  }
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    accountCount: template.accounts.length,
    byType,
    bankStubCount: template.bankStubs.length,
  };
}
