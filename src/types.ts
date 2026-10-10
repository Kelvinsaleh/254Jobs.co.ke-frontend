export type ListingType = "job" | "internship" | "attachment";

export type Listing = {
  id: string;
  source: string;
  source_url: string;
  title: string;
  company: string | null;
  location: string;
  county: string | null;
  listing_type: ListingType | string;
  description: string;
  published_at: string | null;
  scraped_at: string;
};

export type HomeResponse = {
  featured: Listing | null;
  internships: Listing[];
  attachments: Listing[];
  jobs: Listing[];
  nairobi: Listing[];
  remote: Listing[];
  stats: {
    jobs: number;
    internships: number;
    attachments: number;
    total: number;
  };
};

export type ListResponse = {
  total: number;
  page: number;
  limit: number;
  items: Listing[];
};

export type ScrapeResponse = {
  running: boolean;
  reports: { source: string; fetched: number; upserted: number; error: string | null }[];
};
