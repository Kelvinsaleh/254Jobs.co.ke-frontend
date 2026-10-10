import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchHome, fetchListing, fetchListings, runScrape } from "./api";
import type { HomeResponse, Listing } from "./types";

function typeLabel(type: string) {
  if (type === "internship") return "Internship";
  if (type === "attachment") return "Attachment";
  return "Job";
}

function posterHue(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function Poster({ item }: { item: Listing }) {
  const hue = posterHue(item.company || item.title);
  return (
    <div className="poster" style={{ background: `linear-gradient(160deg, hsl(${hue} 55% 28%), hsl(${(hue + 40) % 360} 70% 12%))` }}>
      <span className={`ribbon ${item.listing_type}`}>{typeLabel(item.listing_type)}</span>
      <strong>{(item.company || item.title).slice(0, 18)}</strong>
    </div>
  );
}

function Card({ item }: { item: Listing }) {
  return (
    <Link className="card" to={`/watch/${item.id}`}>
      <Poster item={item} />
      <h3>{item.title}</h3>
      <p>
        {item.company || "Employer"} · {item.location}
      </p>
    </Link>
  );
}

function Row({ title, items }: { title: string; items: Listing[] }) {
  if (!items.length) return null;
  return (
    <section className="row">
      <h2>{title}</h2>
      <div className="scroller">
        {items.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [scraping, setScraping] = useState(false);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    navigate({ pathname: "/browse", search: query ? `?q=${encodeURIComponent(query)}` : "" });
  }

  async function onScrape() {
    setScraping(true);
    try {
      await runScrape();
      window.location.reload();
    } finally {
      setScraping(false);
    }
  }

  return (
    <div className="app">
      <header className="nav">
        <Link className="logo" to="/">
          <span className="logo-code">254</span>jobs
        </Link>
        <nav>
          <Link to={{ pathname: "/browse", search: "?type=job" }}>Jobs</Link>
          <Link to={{ pathname: "/browse", search: "?type=internship" }}>Internships</Link>
          <Link to={{ pathname: "/browse", search: "?type=attachment" }}>Attachments</Link>
        </nav>
        <form onSubmit={onSearch}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Kenya roles…" />
        </form>
        <button type="button" className="ghost" onClick={onScrape} disabled={scraping}>
          {scraping ? "Refreshing…" : "Refresh listings"}
        </button>
      </header>
      {children}
    </div>
  );
}

function HomePage() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    async function load() {
      try {
        const home = await fetchHome();
        if (cancelled) return 0;
        setData(home);
        return home.stats.total;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
        return 0;
      }
    }
    load().then((total) => {
      if (cancelled || total > 0) return;
      timer = window.setInterval(() => {
        load().then((next) => {
          if (next > 0 && timer) window.clearInterval(timer);
        });
      }, 2500);
    });
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  if (error) {
    return (
      <main className="empty">
        <h1>Could not reach the 254jobs API</h1>
        <p>Start the Rust backend on port 8080, then refresh.</p>
      </main>
    );
  }
  if (!data) return <main className="empty">Loading Kenya listings…</main>;

  const featured = data.featured;
  return (
    <main>
      {featured ? (
        <section className="hero">
          <div>
            <p className="kicker">Kenya · {typeLabel(featured.listing_type)}</p>
            <h1>{featured.title}</h1>
            <p className="lede">
              {featured.company || "Hiring now"} · {featured.location}
            </p>
            <p className="synopsis">{featured.description.slice(0, 220)}</p>
            <div className="actions">
              <Link className="play" to={`/watch/${featured.id}`}>
                View details
              </Link>
              <a className="ghost" href={featured.source_url} target="_blank" rel="noreferrer">
                Apply on source
              </a>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero">
          <div>
            <h1>254jobs: Kenya jobs, internships, and attachments in one feed</h1>
            <p className="lede">Listings are still syncing from public Kenyan boards. Hit refresh, or wait for the first crawl.</p>
          </div>
        </section>
      )}
      <div className="stats">
        <span>{data.stats.total} listings</span>
        <span>{data.stats.internships} internships</span>
        <span>{data.stats.attachments} attachments</span>
        <span>{data.stats.jobs} jobs</span>
      </div>
      <Row title="Internships" items={data.internships} />
      <Row title="Industrial attachments" items={data.attachments} />
      <Row title="Latest jobs" items={data.jobs} />
      <Row title="Nairobi" items={data.nairobi} />
      <Row title="Remote" items={data.remote} />
    </main>
  );
}

function BrowsePage() {
  const [params] = useSearchParams();
  const type = params.get("type") || undefined;
  const q = params.get("q") || undefined;
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchListings({ type, q, limit: "48" })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [type, q]);

  const heading = useMemo(() => {
    if (q) return `Results for “${q}”`;
    if (type === "internship") return "Internships in Kenya";
    if (type === "attachment") return "Industrial attachments in Kenya";
    if (type === "job") return "Jobs in Kenya";
    return "Browse Kenya listings";
  }, [q, type]);

  return (
    <main className="browse">
      <h1>{heading}</h1>
      <p className="muted">{loading ? "Loading…" : `${total} listings`}</p>
      <div className="grid">
        {items.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}

function DetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Listing | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListing(id).then(setItem);
  }, [id]);

  if (!item) return <main className="empty">Loading…</main>;

  return (
    <main className="detail">
      <p className="kicker">
        {typeLabel(item.listing_type)} · {item.source} · {item.location}
      </p>
      <h1>{item.title}</h1>
      <p className="lede">{item.company || "Employer not listed"}</p>
      <div className="actions">
        <a className="play" href={item.source_url} target="_blank" rel="noreferrer">
          Apply on original site
        </a>
        <Link className="ghost" to="/">
          Back home
        </Link>
      </div>
      <article>
        <p>{item.description || "No description was published in the public feed. Open the original listing to apply."}</p>
      </article>
    </main>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <Shell>
      <Routes location={location} key={location.pathname + location.search}>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/watch/:id" element={<DetailPage />} />
      </Routes>
    </Shell>
  );
}
