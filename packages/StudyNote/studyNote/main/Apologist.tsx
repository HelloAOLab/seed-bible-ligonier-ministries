const { useEffect, useState, useMemo, useRef } = os.appHooks;
const getStyleOf = await thisBot.GetStyle();

function formatDateISO(s) {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return null;
  }
}

// function Chips({ items }) {
//     if (!items || !items.length) return null;
//     return (
//         <div className="sg-chips">
//             {items.map((k, i) => <span className="sg-chip" key={`${k}-${i}`}>{k}</span>)}
//         </div>
//     );
// }

// function pill(text) { return text ? <span className="sg-pill">{text}</span> : null; }

function getDomain(u) {
  if (!u) return "";

  try {
    if (!/^https?:\/\//i.test(u)) {
      u = "http://" + u;
    }

    let hostname = new URL(u).hostname;

    // Remove leading "www."
    hostname = hostname.replace(/^www\./, "");

    return hostname;
  } catch {
    return "";
  }
}

function formatDomain(domain) {
  if (!domain) return "";

  // Map specific domains to friendly names
  if (domain.includes("tabletalkmagazine.com")) return "TableTalk Magazine";
  if (domain.includes("learn.ligonier.org")) return "Ligonier";

  // Return domain as-is for others
  return domain;
}

const TYPE_ORDER = {
  youtube: 0,
  episode: 10,
  url: 20,
  book: 30,
};

const SOURCE_PRIORITY = {
  youtube: 0,
  tabletalk: 1,
  ligonier: 2,
  default: 5,
};

const TITLE_WHITESPACE_REGEX = /\s+/g;

function normalizeTitleValue(value) {
  if (!value) return "";
  return value.trim().replace(TITLE_WHITESPACE_REGEX, " ").toLowerCase();
}

function getPrimaryUrl(item) {
  return item?.url || item?.referral_url || item?.listing_url || "";
}

function getResultDomain(item) {
  const domain = getDomain(getPrimaryUrl(item));
  return domain ? domain.toLowerCase() : "";
}

function computeResultRank(item) {
  const type = (item?.type || "").toLowerCase();
  if (type === "youtube") {
    return SOURCE_PRIORITY.youtube;
  }

  const domain = getResultDomain(item);
  if (domain.includes("tabletalkmagazine.com")) {
    return SOURCE_PRIORITY.tabletalk;
  }
  if (domain.includes("ligonier.org")) {
    return SOURCE_PRIORITY.ligonier;
  }

  return SOURCE_PRIORITY.default + (TYPE_ORDER[type] ?? 50);
}

function compareResults(a, b) {
  const rankDiff = computeResultRank(a) - computeResultRank(b);
  if (rankDiff !== 0) return rankDiff;

  const typeDiff =
    (TYPE_ORDER[(a?.type || "").toLowerCase()] ?? 100) -
    (TYPE_ORDER[(b?.type || "").toLowerCase()] ?? 100);
  if (typeDiff !== 0) return typeDiff;

  const titleA = normalizeTitleValue(a?.title || a?.Name || "");
  const titleB = normalizeTitleValue(b?.title || b?.Name || "");
  if (titleA < titleB) return -1;
  if (titleA > titleB) return 1;
  return 0;
}

function dedupeResults(results) {
  const seen = new Map();
  const deduped = [];

  results.forEach((item) => {
    const normalizedTitle = normalizeTitleValue(item?.title || item?.Name || "");
    if (!normalizedTitle) {
      deduped.push(item);
      return;
    }

    const candidatePriority = computeResultRank(item);

    if (!seen.has(normalizedTitle)) {
      seen.set(normalizedTitle, { index: deduped.length, priority: candidatePriority });
      deduped.push(item);
      return;
    }

    const existing = seen.get(normalizedTitle);
    if (candidatePriority < existing.priority) {
      deduped[existing.index] = item;
      existing.priority = candidatePriority;
    }
  });

  return deduped;
}

function buildResultKey(item) {
  if (!item) return null;
  if (item.id) {
    return `id:${item.id}`;
  }
  const titleKey = normalizeTitleValue(item?.title || item?.Name || "");
  if (!titleKey) return null;
  const domain = getResultDomain(item);
  return `title:${titleKey}|domain:${domain}`;
}

// function getFavicon(u) {
//     const d = getDomain(u);
//     if (!d) return null;
//     // lightweight favicon service (works for most sites)
//     return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64`;
// }

function toEmbeddableUrl(item) {
  const url = item?.url || "";
  if (!url) return "";
  if (
    item.type === "youtube" ||
    /youtube\.com\/watch\?v=|youtu\.be\//i.test(url)
  ) {
    const idMatch =
      url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
    const vid = idMatch ? idMatch[1] : null;
    return vid ? `https://www.youtube.com/embed/${vid}` : url;
  }
  return url;
}

function SgCard({ item, isOpen, viewMode = "list" }) {
  const [previewH, setPreviewH] = useState(0);
  const previewRef = useMemo(() => ({ el: null }), []);
  const [frameKey, setFrameKey] = useState(0);

  const date =
    formatDateISO(item.published_on) || formatDateISO(item.created_at) || null;

  const domain = useMemo(
    () => getDomain(item.referral_url),
    [item.referral_url]
  );
  const formattedDomain = useMemo(() => formatDomain(domain), [domain]);
  const icon = useMemo(() => item.image_url, [item.image_url]);

  const isBook = item.type === "book";
  const isUrl = item.type === "url";
  const isYoutube = item.type === "youtube";
  const isEpisode = item.type === "episode";
  const isTableTalk = domain?.includes("tabletalkmagazine.com") || false;

  const openInNewTab = (e) => {
    e.preventDefault();
    
    // If it's a TableTalk item, open in devotional tab iframe
    if (isTableTalk) {
      const previewUrl = item.url || item.referral_url || item.listing_url;
      if (previewUrl && globalThis.StudyNoteOpenPreview) {
        globalThis.StudyNoteOpenPreview(previewUrl, item.title || "Preview");
      }
    } else {
      // For everything else, open normally in a new tab
      window.open(item.url, "_blank", "noopener");
    }
  };

  const embUrl = useMemo(() => toEmbeddableUrl(item), [item.listing_url, item.type, item.url]);
  const videoSrc = useMemo(() => {
    if (!isYoutube || !embUrl) return "";
    const separator = embUrl.includes("?") ? "&" : "?";
    return `${embUrl}${separator}autoplay=0&rel=0`;
  }, [embUrl, isYoutube]);
  const canPreview = !isYoutube && (!!item.image_url || isUrl);

  const renderYoutubePlayer = () => (
    <div className="sg-previewVideo">
      {videoSrc ? (
        <iframe
          key={frameKey}
          src={videoSrc}
          title={item.title || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : item.image_url ? (
        <img
          className="sg-previewVideoThumb"
          src={item.image_url}
          alt={item.title || "Video thumbnail"}
        />
      ) : (
        <div
          className="sg-previewVideoThumb sg-previewVideoThumb--fallback"
          aria-hidden="true"
        />
      )}
    </div>
  );

  // short description (whatever exists in payload)
  const desc =
    item.description || item.summary || item.snippet || item.excerpt || "";

  useEffect(() => {
    if (previewRef.el) {
      const h = previewRef.el.scrollHeight || 0;
      setPreviewH(h > 8 ? h : 8);
    }
  }, [isOpen, frameKey, item.url]);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) setFrameKey((k) => k + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const url = item.url || item.referral_url;

  return (
    <article
      className={`sg-card ${isBook ? "sg-card-book-inline" : ""} ${
        viewMode === "grid" ? "sg-card-grid" : "sg-card-list"
      } ${isOpen ? "is-open" : ""}`}
    >
      {!isBook && (
        <header className="sg2-head">
          <div className="sg2-headLeft">
            {icon ? (
              <img className="sg2-favicon" src={icon} alt="" />
            ) : (
              <span className="sg2-favicon sg2-fallback" />
            )}
            <span className="sg2-domain" title={domain}>
              {isYoutube
                ? "YouTube"
                : isEpisode
                ? "Episode"
                : formattedDomain || "external"}
            </span>
            {date && (
              <>
                <span className="sg2-dot" />
                <span className="sg2-calendar">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1.25 10C1.05 10 0.875 9.925 0.725 9.775C0.575 9.625 0.5 9.45 0.5 9.25V1.5C0.5 1.3 0.575 1.125 0.725 0.975C0.875 0.825 1.05 0.75 1.25 0.75H2.0625V0H2.875V0.75H7.125V0H7.9375V0.75H8.75C8.95 0.75 9.125 0.825 9.275 0.975C9.425 1.125 9.5 1.3 9.5 1.5V9.25C9.5 9.45 9.425 9.625 9.275 9.775C9.125 9.925 8.95 10 8.75 10H1.25ZM1.25 9.25H8.75V3.875H1.25V9.25ZM1.25 3.125H8.75V1.5H1.25V3.125ZM5 6C4.85833 6 4.73958 5.95208 4.64375 5.85625C4.54792 5.76042 4.5 5.64167 4.5 5.5C4.5 5.35833 4.54792 5.23958 4.64375 5.14375C4.73958 5.04792 4.85833 5 5 5C5.14167 5 5.26042 5.04792 5.35625 5.14375C5.45208 5.23958 5.5 5.35833 5.5 5.5C5.5 5.64167 5.45208 5.76042 5.35625 5.85625C5.26042 5.95208 5.14167 6 5 6ZM3 6C2.85833 6 2.73957 5.95208 2.64375 5.85625C2.54792 5.76042 2.5 5.64167 2.5 5.5C2.5 5.35833 2.54792 5.23958 2.64375 5.14375C2.73957 5.04792 2.85833 5 3 5C3.14167 5 3.26042 5.04792 3.35625 5.14375C3.45207 5.23958 3.5 5.35833 3.5 5.5C3.5 5.64167 3.45207 5.76042 3.35625 5.85625C3.26042 5.95208 3.14167 6 3 6ZM7 6C6.85833 6 6.73958 5.95208 6.64375 5.85625C6.54792 5.76042 6.5 5.64167 6.5 5.5C6.5 5.35833 6.54792 5.23958 6.64375 5.14375C6.73958 5.04792 6.85833 5 7 5C7.14167 5 7.26042 5.04792 7.35625 5.14375C7.45208 5.23958 7.5 5.35833 7.5 5.5C7.5 5.64167 7.45208 5.76042 7.35625 5.85625C7.26042 5.95208 7.14167 6 7 6ZM5 8C4.85833 8 4.73958 7.95208 4.64375 7.85625C4.54792 7.76042 4.5 7.64167 4.5 7.5C4.5 7.35833 4.54792 7.23958 4.64375 7.14375C4.73958 7.04792 4.85833 7 5 7C5.14167 7 5.26042 7.04792 5.35625 7.14375C5.45208 7.23958 5.5 7.35833 5.5 7.5C5.5 7.64167 5.45208 7.76042 5.35625 7.85625C5.26042 7.95208 5.14167 8 5 8ZM3 8C2.85833 8 2.73957 7.95208 2.64375 7.85625C2.54792 7.76042 2.5 7.64167 2.5 7.5C2.5 7.35833 2.54792 7.23958 2.64375 7.14375C2.73957 7.04792 2.85833 7 3 7C3.14167 7 3.26042 7.04792 3.35625 7.14375C3.45207 7.23958 3.5 7.35833 3.5 7.5C3.5 7.64167 3.45207 7.76042 3.35625 7.85625C3.26042 7.95208 3.14167 8 3 8ZM7 8C6.85833 8 6.73958 7.95208 6.64375 7.85625C6.54792 7.76042 6.5 7.64167 6.5 7.5C6.5 7.35833 6.54792 7.23958 6.64375 7.14375C6.73958 7.04792 6.85833 7 7 7C7.14167 7 7.26042 7.04792 7.35625 7.14375C7.45208 7.23958 7.5 7.35833 7.5 7.5C7.5 7.64167 7.45208 7.76042 7.35625 7.85625C7.26042 7.95208 7.14167 8 7 8Z"
                      fill="#949494"
                    />
                  </svg>
                </span>
                <span className="sg2-date">{date}</span>
              </>
            )}
          </div>
          <div className="sg2-headRight">
            {url && !isYoutube && (
              <a
                className="sg2-open"
                href={url}
                onClick={openInNewTab}
                target={isTableTalk ? undefined : "_blank"}
                rel={isTableTalk ? undefined : "noopener noreferrer"}
                referrerPolicy={isTableTalk ? undefined : "no-referrer"}
                title={isTableTalk ? "Open in devotional tab" : "Open in new tab"}
                aria-label={isTableTalk ? "Open in devotional tab" : "Open in new tab"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 12C0.733333 12 0.5 11.9 0.3 11.7C0.1 11.5 0 11.2667 0 11V1C0 0.733333 0.1 0.5 0.3 0.3C0.5 0.1 0.733333 0 1 0H5.65V1H1V11H11V6.35H12V11C12 11.2667 11.9 11.5 11.7 11.7C11.5 11.9 11.2667 12 11 12H1ZM4.36667 8.35L3.66667 7.63333L10.3 1H6.65V0H12V5.35H11V1.71667L4.36667 8.35Z"
                    fill="#859E3B"
                  />
                </svg>
              </a>
            )}
          </div>
        </header>
      )}

      {!isBook && (
        <div className="sg2-bodyTitle">
          {url ? (
            <a
              className="sg2-title-link"
              href={url}
              onClick={openInNewTab}
              target={isTableTalk ? undefined : "_blank"}
              rel={isTableTalk ? undefined : "noopener noreferrer"}
              title={isTableTalk ? "Open in devotional tab" : "Open in new tab"}
              aria-label={isTableTalk ? "Open in devotional tab" : "Open in new tab"}
            >
              <h3 className="sg2-title" title={item.title}>
                {item.title}
              </h3>
            </a>
          ) : (
            <h3 className="sg2-title" title={item.title}>
              {item.title}
            </h3>
          )}

        </div>
      )}

      {isYoutube && (
        <div className="sg-youtubeEmbed">
          {renderYoutubePlayer()}
        </div>
      )}

      {!isBook && desc ? <p className="sg2-desc">{desc}</p> : null}

      {!isYoutube && (
        <div
          className="sg-previewAnim"
          style={{ "--sg-preview-h": `${previewH}px` }}
          aria-hidden={!isOpen}
        >
          {isOpen && canPreview && (
            <div className="sg-preview" ref={(n) => (previewRef.el = n)}>
              <div className="sg-previewImgContainer">
                <img
                  className="sg-previewImg"
                  src={item.image_url}
                  alt={item.title || `preview-${item.id}`}
                />
              </div>
            {url && (
              <a
                href={url}
                className="sg-preview-learnMoreLink"
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                Learn More
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 12C0.733333 12 0.5 11.9 0.3 11.7C0.1 11.5 0 11.2667 0 11V1C0 0.733333 0.1 0.5 0.3 0.3C0.5 0.1 0.733333 0 1 0H5.65V1H1V11H11V6.35H12V11C12 11.2667 11.9 11.5 11.7 11.7C11.5 11.9 11.2667 12 11 12H1ZM4.36667 8.35L3.66667 7.63333L10.3 1H6.65V0H12V5.35H11V1.71667L4.36667 8.35Z"
                    fill="#859E3B"
                  />
                </svg>
              </a>
            )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// const DEFAULT_URL = "https://temp-proxy-server-nu.vercel.app/proxy/search";
const DEFAULT_URL =
  "https://ligonier.ministries.bot/api/v1/corpus/search?cache_ttl=300";

/**
 * Props:
 * - search: string (required)
 * - url?: string
 * - enabled?: boolean
 * - className?: string
 * - authHeader?: string
 * - cacheTtl?: number
 */
function ApologistSearch({
  search,
  trigger = 0,
  url = DEFAULT_URL,
  enabled = true,
  className = "",
  authHeader = null,
  cacheTtl = null,
  level = "chapter",
  baselineQuery = "",
  label = "",
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [openIds, setOpenIds] = useState(new Set());
  const [searchParam, setSearchParam] = useState("");
  const [searchRunId, setSearchRunId] = useState(0);
  const [viewMode, setViewMode] = useState("grid"); // "list" or "grid"
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(20);
  const [showSpinner, setShowSpinner] = useState(false);
  const [allData, setAllData] = useState([]);
  const lastSearchKeyRef = useRef(null);
  const lastResultKeysRef = useRef(new Set());
  const baselineQueryRef = useRef(baselineQuery || "");
  const baselineResultKeysRef = useRef(new Set());
  const resolvedLevel = (level || "chapter").toLowerCase();
  const isVerseLevel = resolvedLevel === "verse";
  const currentBaselineQuery = baselineQuery || baselineQueryRef.current;
  const showResetControl = Boolean(isVerseLevel && currentBaselineQuery);
  const headerLabel =
    label ||
    (isVerseLevel && currentBaselineQuery
      ? currentBaselineQuery
      : searchParam);

  useEffect(() => {
    const trimmed = (search ?? "").trim();
    if (!trimmed) {
      setSearchParam("");
      setSearchRunId(trigger);
      return;
    }

    setSearchParam(trimmed);
    setSearchRunId(trigger);
  }, [search, trigger]);

  useEffect(() => {
    let timer;
    if (loading) {
        timer = setTimeout(() => setShowSpinner(true), 2000);
    } else {
        setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    baselineQueryRef.current = baselineQuery || baselineQueryRef.current;
  }, [baselineQuery]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setAllData([]);
      setErr("");
      setOpenIds(new Set());
      setHasMore(false);
      setDisplayedCount(20);
      setLoading(false);
      return;
    }

    if (!searchParam.trim()) {
      lastSearchKeyRef.current = null;
      lastResultKeysRef.current = new Set();
      if (resolvedLevel === "chapter") {
        baselineQueryRef.current = baselineQuery || "";
        baselineResultKeysRef.current = new Set();
      }
    }

    let cancelled = false;
    console.log("searchParam: ", searchParam);

    async function run() {
      if (!searchParam || !searchParam.trim()) {
        setData([]);
        setAllData([]);
        setErr("");
        setOpenIds(new Set());
        setHasMore(false);
        setDisplayedCount(20);
        return;
      }
      setLoading(true);
      setErr("");
      setOpenIds(new Set());
      setHasMore(false);
      setDisplayedCount(20);

      try {
        const trimmedQuery = searchParam.trim();
        const normalizedSearchKey = trimmedQuery.toLowerCase();

        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(authHeader
            ? { Authorization: authHeader }
            : { Authorization: "Bearer apg_TS0V0FHInZlAavPDG5MA9gCGziBz" }),
          ...(cacheTtl != null
            ? { "x-cache-ttl": String(cacheTtl) }
            : {}),
        };

        const payload = {
          query: trimmedQuery,
          limit: 100, // Get all results
          filters: {
            team_id: 111,
            types: ["article", "book", "url", "media", "youtube", "episode"],
          },
        };

        const res = await web.post(url, payload, { headers });

        if (cancelled) return;
        if (res.status !== 200) {
          setErr(res?.error || `HTTP ${res.status}`);
          setData([]);
          setAllData([]);
          setOpenIds(new Set());
          return;
        }

        const allResults = Array.isArray(res?.data?.results)
          ? res.data.results
          : [];

        const allowedTypes = new Set(["youtube", "episode", "url", "book"]);
        const filteredResults = allResults.filter((item) =>
          allowedTypes.has(item?.type)
        );

        const sortedResults = filteredResults.slice().sort(compareResults);
        const dedupedResults = dedupeResults(sortedResults);

        if (resolvedLevel === "chapter") {
          baselineQueryRef.current = trimmedQuery;
          baselineResultKeysRef.current = new Set();
          dedupedResults.forEach((item) => {
            const key = buildResultKey(item);
            if (key) {
              baselineResultKeysRef.current.add(key);
            }
          });
        }

        let finalResults = dedupedResults;

        if (
          resolvedLevel !== "chapter" &&
          baselineResultKeysRef.current.size
        ) {
          finalResults = finalResults.filter((item) => {
            const key = buildResultKey(item);
            if (!key) return true;
            return !baselineResultKeysRef.current.has(key);
          });
        }

        if (
          lastSearchKeyRef.current &&
          normalizedSearchKey &&
          normalizedSearchKey !== lastSearchKeyRef.current &&
          lastResultKeysRef.current.size
        ) {
          finalResults = finalResults.filter((item) => {
            const key = buildResultKey(item);
            if (!key) return true;
            return !lastResultKeysRef.current.has(key);
          });
        }

        setAllData(finalResults);
        setData(finalResults.slice(0, 20)); // Show first 20
        setHasMore(finalResults.length > 20); // Show "Load More" if there are more than 20 results
        // Open all book cards initially
        const bookIds = finalResults
          .filter((item) => item.type === "book" && item.id)
          .map((item) => item.id);
        const youtubeIds = finalResults
          .filter((item) => item.type === "youtube" && item.id)
          .map((item) => item.id);
        setOpenIds(new Set([...bookIds, ...youtubeIds]));

        lastSearchKeyRef.current = normalizedSearchKey || null;
        lastResultKeysRef.current = new Set();
        finalResults.forEach((item) => {
          const key = buildResultKey(item);
          if (key) {
            lastResultKeysRef.current.add(key);
          }
        });
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Network error");
          setData([]);
          setAllData([]);
          setOpenIds(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParam, searchRunId, enabled, authHeader, cacheTtl, url, level, baselineQuery]);

  const handleResetToBaseline = () => {
    if (!currentBaselineQuery) return;

    const helper = globalThis.UpdateStudyNoteSearch;
    if (typeof helper === "function") {
      helper(currentBaselineQuery, {
        level: "chapter",
        forceRefresh: true,
      });
    } else {
      globalThis.GlobalSearch = currentBaselineQuery;
      globalThis.GlobalSearchLevel = "chapter";
      globalThis.GlobalSearchLabel = currentBaselineQuery;
    }
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      const newDisplayedCount = displayedCount + 10;
      const newData = allData.slice(0, newDisplayedCount);

      setData(newData);
      setDisplayedCount(newDisplayedCount);
      setHasMore(newDisplayedCount < allData.length);

      // Add new book IDs to openIds
      const newBookIds = newData
        .filter((item) => item.type === "book" && item.id)
        .map((item) => item.id);
      setOpenIds((prev) => {
        const merged = new Set(prev);
        newBookIds.forEach((id) => merged.add(id));
        return merged;
      });

      setLoadingMore(false);
    }, 300);
  };

  if (!search?.trim())
    return <div className="sg-muted">Type a search to begin…</div>;

  if (showSpinner) {
    return (
      <div
        className={`sg-loading ${className}`}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="sg-spinner" role="status" aria-label="Loading" />
        <div className="sg-loading-text">Loading…</div>

        <style>{getStyleOf("apologist.css")}</style>
      </div>
    );
  }

  if (err) {
    return (
      <div className="sg-error">
        <b>Search error:</b> {err}
        <div className="sg-muted sg-small">
          If a preview is blocked, use “Open”.
        </div>
        <style>{getStyleOf("apologist.css")}</style>
        <style>{`
                    .sg-card-book-inline {
                        padding-top: 0;
                    }
                    
                    .sg-card-book-inline.is-open {
                        border-top: none;
                    }
                    
                    .sg-card-book-inline .sg-previewAnim {
                        margin-top: 0;
                    }
                    
                    .sg-card-book-inline .sg-preview {
                        padding-top: 0;
                    }
                    
                    .sg-card-book-inline .sg-previewImgContainer {
                        max-height: 400px;
                        overflow: hidden;
                    }
                    
                    .sg-card-book-inline .sg-previewImg {
                        max-height: 400px;
                        width: 100%;
                        object-fit: contain;
                    }
                    
                    .sg-loadMore {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 24px 0;
                        width: 100%;
                        grid-column: 1 / -1; /* Span all columns in grid mode */
                        text-align: center;
                    }
                    
                    .sg-loadMoreBtn {
                        padding: 12px 24px;
                        background: #8ca443;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .sg-loadMoreBtn:hover:not(:disabled) {
                        background: #7a923a;
                    }
                    
                    .sg-loadMoreBtn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                `}</style>
      </div>
    );
  }

  return (
    <div className={`sg-searchWrap ${className}`}>
      <div className="sg-header">
        {data && data.length > 0 && (
          <div className="sg-headerTop">
            {showResetControl && (
              <button
                type="button"
                className="sg-resetBtn"
                onClick={handleResetToBaseline}
                title={`Back to ${currentBaselineQuery}`}
                aria-label="Back to chapter search"
              >
                ×
              </button>
            )}
            <div className="sg-resultCount">{headerLabel} | {data.length} Results</div>
            <div className="sg-viewToggle">
              <button
                className={`sg-toggle-btn ${
                  viewMode === "list" ? "active" : ""
                }`}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_439_369)">
                    <path
                      d="M14 5L2 5C1.73487 4.99971 1.48069 4.89426 1.29321 4.70679C1.10574 4.51931 1.00029 4.26513 1 4L1 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2V4C14.9997 4.26513 14.8943 4.51931 14.7068 4.70679C14.5193 4.89426 14.2651 4.99971 14 5ZM2 2L2 4L14 4V2L2 2Z"
                      fill="currentColor"
                    />
                    <path
                      d="M14 15L2 15C1.73487 14.9997 1.48069 14.8943 1.29321 14.7068C1.10574 14.5193 1.00029 14.2651 1 14L1 12C1.00028 11.7349 1.10572 11.4807 1.2932 11.2932C1.48068 11.1057 1.73487 11.0003 2 11L14 11C14.2651 11.0003 14.5193 11.1057 14.7068 11.2932C14.8943 11.4807 14.9997 11.7349 15 12V14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15ZM2 12L2 14L14 14V12L2 12Z"
                      fill="currentColor"
                    />
                    <path
                      d="M14 10L2 10C1.73487 9.99971 1.48069 9.89426 1.29321 9.70679C1.10574 9.51931 1.00029 9.26513 1 9L1 7C1.00028 6.73487 1.10572 6.48068 1.2932 6.2932C1.48068 6.10572 1.73487 6.00028 2 6L14 6C14.2651 6.00028 14.5193 6.10572 14.7068 6.2932C14.8943 6.48068 14.9997 6.73487 15 7V9C14.9997 9.26513 14.8943 9.51931 14.7068 9.70679C14.5193 9.89426 14.2651 9.99971 14 10ZM2 7L2 9L14 9V7L2 7Z"
                      fill="currentColor"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_439_369">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
              <button
                className={`sg-toggle-btn ${
                  viewMode === "grid" ? "active" : ""
                }`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_439_733)">
                    <path
                      d="M15 2L15 14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15L10 15C9.73487 14.9997 9.48068 14.8943 9.2932 14.7068C9.10572 14.5193 9.00028 14.2651 9 14L9 2C9.00028 1.73487 9.10572 1.48068 9.2932 1.2932C9.48068 1.10572 9.73487 1.00028 10 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2ZM10 14L14 14L14 2L10 2L10 14Z"
                      fill="currentColor"
                    />
                    <path
                      d="M7 2L7 14C6.99972 14.2651 6.89428 14.5193 6.7068 14.7068C6.51932 14.8943 6.26513 14.9997 6 15L2 15C1.73487 14.9997 1.48068 14.8943 1.2932 14.7068C1.10572 14.5193 1.00028 14.2651 1 14L0.999999 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L6 1C6.26513 1.00028 6.51932 1.10572 6.7068 1.2932C6.89428 1.48068 6.99972 1.73487 7 2ZM2 14L6 14L6 2L2 2L2 14Z"
                      fill="currentColor"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_439_733">
                      <rect
                        width="16"
                        height="16"
                        fill="white"
                        transform="translate(0 16) rotate(-90)"
                      />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`sg-results ${
          viewMode === "grid" ? "sg-grid" : "sg-list"
        } ${className}`}
      >
        {data && data.length > 0 ? (
          <>
            {data.map((item) =>
              item?.id ? (
                <SgCard
                  key={String(item.id)}
                  item={item}
                  isOpen={openIds.has(item.id)}
                  viewMode={viewMode}
                />
              ) : null
            )}
            {hasMore && (
              <div className="sg-loadMore">
                <button
                  className="sg-loadMoreBtn"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <div className="sg-spinner-small"></div>
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          !loading && (
          <div className="sg-empty">
            <div className="sg-emptyIcon">🔎</div>
            <div className="sg-emptyTitle">No results</div>
            <div className="sg-emptyHint">
              Try a broader term or different keywords.
            </div>
          </div>
          )
        )}

        <style>{getStyleOf("apologist.css")}</style>
      </div>

      <style>{`
                .sg-card-book-inline {
                    padding-top: 0;
                }
                
                .sg-card-book-inline.is-open {
                    border-top: none;
                }
                
                .sg-card-book-inline .sg-previewAnim {
                    margin-top: 0;
                }
                
                .sg-card-book-inline .sg-preview {
                    padding-top: 0;
                }
                
                .sg-card-book-inline .sg-previewImgContainer {
                    max-height: 400px;
                    overflow: hidden;
                }
                
                .sg-card-book-inline .sg-previewImg {
                    max-height: 400px;
                    width: 100%;
                    object-fit: contain;
                }
                
                .sg-loadMore {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 10px 0;
                    width: 100%;
                    grid-column: 1 / -1; /* Span all columns in grid mode */
                    text-align: center;
                }
                
                .sg-loadMoreBtn {
                    padding: 12px 24px;
                    background: transparent;
                    color: #8ca443;
                    border-radius: 6px;
                    border: 1px solid #8ca443;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .sg-loadMoreBtn:hover:not(:disabled) {
                    background: #7a923a;
                }
                
                .sg-loadMoreBtn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .sg-header {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .sg-headerTop {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 12px;
                }
                
                .sg-resultCount {
                    font-size: 14px;
                    color: #666;
                    font-weight: 500;
                }
                
                .sg-viewToggle {
                    display: flex;
                    gap: 4px;
                }

                .sg-resetBtn {
                    border: none;
                    background: transparent;
                    color: #8ca443;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    line-height: 1;
                }

                .sg-resetBtn:hover {
                    color: #7a923a;
                }

                .sg-youtubeEmbed {
                    margin-top: 12px;
                }

                .sg-youtubeEmbed .sg-previewVideo {
                    border-radius: 12px;
                }

                .sg-previewVideo {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background: #000;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .sg-previewVideo iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    display: block;
                }

                .sg-previewVideoButton {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    background: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sg-previewVideoThumb {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .sg-previewVideoThumb--fallback {
                    background: linear-gradient(135deg, #1f1f1f, #3d3d3d);
                }

                .sg-previewVideoButton::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.45));
                    pointer-events: none;
                }

                .sg-videoPlayIcon {
                    position: absolute;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    background: rgba(0,0,0,0.6);
                    color: #fff;
                }

                .sg-videoPlayIcon svg {
                    width: 34px;
                    height: 34px;
                }
            `}</style>
    </div>
  );
}

globalThis.ApologistSearch = ApologistSearch;

return ApologistSearch;
