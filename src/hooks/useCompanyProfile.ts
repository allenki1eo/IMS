"use client";
import useSWR from "swr";

export interface CompanyProfile {
  id: string;
  name: string;
  legalName?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoPath?: string | null;
  currency?: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => (r.ok ? r.json().then((j) => j.data as CompanyProfile) : null));

/** The active company's profile (letterheads, document footers). */
export function useCompanyProfile() {
  const { data, isLoading } = useSWR("/api/company", fetcher, { revalidateOnFocus: false });
  return { company: data ?? null, isLoading };
}
