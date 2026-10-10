import type { HomeResponse, ListResponse, Listing, ScrapeResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchHome(): Promise<HomeResponse> {
  const res = await fetch(`${API_BASE}/api/home`);
  if (!res.ok) throw new Error("Failed to load home");
  return res.json();
}

export async function fetchListings(params: Record<string, string | undefined>): Promise<ListResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const res = await fetch(`${API_BASE}/api/listings?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to load listings");
  return res.json();
}

export async function fetchListing(id: string): Promise<Listing> {
  const res = await fetch(`${API_BASE}/api/listings/${id}`);
  if (!res.ok) throw new Error("Listing not found");
  return res.json();
}

export async function runScrape(): Promise<ScrapeResponse> {
  const res = await fetch(`${API_BASE}/api/scrape`, { method: "POST" });
  if (!res.ok) throw new Error("Scrape failed");
  return res.json();
}
