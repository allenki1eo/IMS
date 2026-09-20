import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import {
  COA_TEMPLATES,
  getCoaTemplate,
  summarizeTemplate,
  type CoaTemplate,
} from "./coa-templates";

export function listCoaTemplates() {
  return COA_TEMPLATES.map(summarizeTemplate);
}

export function getCoaTemplatePreview(templateId: string) {
  const template = getCoaTemplate(templateId);
  if (!template) return null;
  return {
    ...summarizeTemplate(template),
    accounts: template.accounts,
    bankStubs: template.bankStubs,
  };
}

export async function getCoaSetupStatus(companyId: string) {
  const accountCount = await db.account.count({ where: { companyId } });
  const bankAccountCount = await db.bankAccount.count({ where: { companyId } });
  return {
    alreadySetUp: accountCount > 0,
    accountCount,
    bankAccountCount,
  };
}

export async function applyCoaTemplate(
  companyId: string,
  templateId: string,
  options: { createBankStubs?: boolean },
  userId: string,
  userName: string,
  ipAddress: string
) {
  const template = getCoaTemplate(templateId);
  if (!template) throw new Error("Template not found");

  const status = await getCoaSetupStatus(companyId);
  if (status.alreadySetUp) {
    return {
      alreadySetUp: true as const,
      message: "Chart of Accounts is already set up",
      accountCount: status.accountCount,
      createdAccounts: 0,
      createdBankStubs: 0,
      templateId: template.id,
      templateName: template.name,
    };
  }

  const createBankStubs = options.createBankStubs !== false;

  const result = await db.$transaction(async (tx) => {
    let createdAccounts = 0;
    for (const account of template.accounts) {
      await tx.account.create({
        data: {
          companyId,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          description: account.description ?? null,
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        },
      });
      createdAccounts += 1;
    }

    let createdBankStubs = 0;
    if (createBankStubs) {
      for (const stub of template.bankStubs) {
        const existing = await tx.bankAccount.findFirst({
          where: {
            companyId,
            name: stub.name,
            accountType: stub.accountType,
          },
        });
        if (existing) continue;
        await tx.bankAccount.create({
          data: {
            companyId,
            name: stub.name,
            accountType: stub.accountType,
            currency: stub.currency || "TZS",
            bankName: stub.bankName ?? null,
            currentBalance: 0,
            isActive: true,
          },
        });
        createdBankStubs += 1;
      }
    }

    return { createdAccounts, createdBankStubs };
  });

  await createAuditLog({
    userId,
    userName,
    action: "COA_SETUP",
    module: "finance",
    resource: "account",
    companyId,
    newValue: {
      templateId: template.id,
      createdAccounts: result.createdAccounts,
      createdBankStubs: result.createdBankStubs,
      createBankStubs,
    },
    description: `Applied CoA template "${template.name}" (${result.createdAccounts} accounts` +
      (result.createdBankStubs ? `, ${result.createdBankStubs} cash/bank stubs` : "") +
      `)`,
    ipAddress,
  });

  return {
    alreadySetUp: false as const,
    message: `Created ${result.createdAccounts} accounts` +
      (result.createdBankStubs ? ` and ${result.createdBankStubs} cash/bank stubs` : ""),
    accountCount: result.createdAccounts,
    createdAccounts: result.createdAccounts,
    createdBankStubs: result.createdBankStubs,
    templateId: template.id,
    templateName: template.name,
  };
}

/** Exported for tests / tooling — full template list with accounts. */
export function getAllCoaTemplates(): CoaTemplate[] {
  return COA_TEMPLATES;
}
