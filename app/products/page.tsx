'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CATEGORIES, PRODUCTS } from '@/lib/products'

export default function ProductsPage() {
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('All')
  const [search, setSearch] = useState('')

  const categoryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { All: PRODUCTS.length }
    for (const cat of CATEGORIES.slice(1)) {
      counts[cat] = PRODUCTS.filter((p) => p.tag === cat).length
    }
    return counts
  }, [])

  const filtered = useMemo(() => {
    let results = category === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.tag === category)
    const q = search.trim().toLowerCase()
    if (q) results = results.filter((p) => p.title.toLowerCase().includes(q))
    return results
  }, [category, search])

  const isSearching = search.trim().length > 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        :root {
          --paper:#FFFDF7; --paper-2:#F5F0E4; --card:#FFFFFF;
          --ink:#14110F; --ink-2:#3A362F; --ink-3:#6B655A; --ink-4:#9C9484;
          --teal:#0B5D52; --teal-dark:#073F38; --teal-bg:#E5F1EE; --teal-bdr:#B9D9D2;
          --marigold:#F5A623; --marigold-dark:#B87814; --marigold-bg:#FDF0DA; --marigold-bdr:#F0CE93;
          --magenta:#C81E5C; --magenta-bg:#FBE7EF; --magenta-bdr:#EFB4CB;
          --line:rgba(20,17,15,0.10); --line-md:rgba(20,17,15,0.18);
        }
        body { font-family:'Inter',-apple-system,sans-serif; }
        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono   { font-family:'Space Mono',monospace; }

        .card {
          background:var(--card); border:1px solid var(--line); border-radius:12px;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          box-shadow: 0 2px 8px rgba(20,17,15,0.04), 0 1px 2px rgba(20,17,15,0.03);
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(20,17,15,0.09), 0 2px 8px rgba(20,17,15,0.04);
          border-color: var(--line-md);
        }

        .section-tag {
          display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:9999px;
          background:var(--teal-bg); border:1px solid var(--teal-bdr); color:var(--teal-dark);
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;
          font-family:'Space Mono',monospace;
        }

        .cat-pill {
          display:inline-flex; align-items:center; gap:6px;
          font-family:'Space Mono',monospace; font-size:12px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.05em; padding:8px 14px;
          border-radius:9999px; border:1.5px solid var(--line-md);
          background:var(--card); color:var(--ink-3); transition:all 0.15s ease; cursor:pointer;
        }
        .cat-pill:hover { border-color:var(--teal); color:var(--teal-dark); }
        .cat-pill.active { background:var(--teal-dark); border-color:var(--teal-dark); color:#fff; }
        .cat-pill .count {
          display:inline-flex; align-items:center; justify-content:center;
          min-width:18px; height:18px; border-radius:9999px; font-size:10px; padding:0 4px;
          background:rgba(255,255,255,0.2); color:inherit;
        }
        .cat-pill:not(.active) .count { background:var(--paper-2); color:var(--ink-4); }

        .search-input {
          width:100%; padding:10px 14px 10px 38px; border-radius:9999px;
          border:1.5px solid var(--line-md); background:var(--card);
          font-size:13px; color:var(--ink); outline:none;
          transition:border-color 0.15s ease, box-shadow 0.15s ease;
          font-family:'Inter',sans-serif;
        }
        .search-input:focus { border-color:var(--teal); box-shadow:0 0 0 3px var(--teal-bg); }
        .search-wrap { position:relative; }
        .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--ink-4); }

        .popular-badge {
          display:inline-flex; align-items:center; gap:4px;
          font-family:'Space Mono',monospace; font-size:10px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.06em; padding:3px 8px;
          border-radius:3px; background:var(--marigold-bg);
          border:1.5px solid var(--marigold-bdr); color:var(--marigold-dark);
        }

        .finance-btn {
          width:100%; text-align:center; font-size:13px; font-weight:700; padding:11px 16px;
          border-radius:4px; border:1.5px solid var(--ink); box-shadow:2px 2px 0 var(--ink);
          background:var(--teal-dark); color:white; cursor:pointer;
          transition:all 0.15s ease; font-family:'Inter',sans-serif; display:block; text-decoration:none;
        }
        .finance-btn:hover { transform:translate(-1px,-1px); box-shadow:3px 3px 0 var(--ink); }
        .finance-btn:active { transform:translate(1px,1px); box-shadow:1px 1px 0 var(--ink); }

        @keyframes card-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .product-grid .card { animation: card-in 0.2s ease forwards; }
      `}</style>

      <div style={{ background: 'var(--paper)', color: 'var(--ink)' }} className="min-h-screen">

        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}
        >
          <Link href="/" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Lendit
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: '50%', background: 'var(--marigold)',
              color: 'var(--teal-dark)', fontSize: 15, fontWeight: 700, marginLeft: 2,
              border: '1.5px solid var(--ink)', verticalAlign: 'middle',
            }}>Be</span>
          </Link>
          <Link href="/dashboard" className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>
            ← Back to dashboard
          </Link>
        </header>

        <section className="pt-10 pb-10 px-6" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="section-tag mb-4">// Shop & Finance</div>
            <h1 className="font-display mb-3" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--ink)', fontWeight: 500 }}>
              Every item, <span style={{ color: 'var(--teal)', fontStyle: 'italic' }}>a payment plan.</span>
            </h1>
            <p className="text-sm max-w-xl" style={{ color: 'var(--ink-3)' }}>
              Browse gadgets, appliances, and furniture from our partner merchants. Pick an item, choose your term, and finance it against your available credit — no cash upfront beyond your down payment.
            </p>
          </div>
        </section>

        <section
          className="py-4 px-6"
          style={{
            borderBottom: '1px solid var(--line)', position: 'sticky', top: 0,
            background: 'var(--paper)', zIndex: 10,
            boxShadow: '0 2px 8px rgba(20,17,15,0.04)',
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setSearch('') }}
                  className={`cat-pill ${category === c ? 'active' : ''}`}
                >
                  {c}
                  <span className="count">{categoryCounts[c]}</span>
                </button>
              ))}
            </div>

            <div className="search-wrap" style={{ minWidth: 200, maxWidth: 260, width: '100%' }}>
              <span className="search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </section>

        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">

            <p className="font-mono text-xs mb-6" style={{ color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
              {isSearching
                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search.trim()}"${category !== 'All' ? ` in ${category}` : ''}`
                : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}${category !== 'All' ? ` · ${category}` : ''}`
              }
            </p>

            {filtered.length > 0 ? (
              <div className="product-grid grid sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <div key={p.slug} className="card overflow-hidden flex flex-col justify-between">
                    <Link href={`/products/${p.slug}`} className="block">
                      <div className="relative h-44">
                        <Image
                          src={p.src}
                          alt={p.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span
                            className="font-mono text-xs px-2.5 py-1 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--teal-dark)', border: '1px solid var(--teal-bdr)', backdropFilter: 'blur(8px)' }}
                          >
                            {p.tag}
                          </span>
                          {p.popular && <span className="popular-badge">★ Popular</span>}
                        </div>
                      </div>
                      <div className="p-5 pb-3">
                        <h3 className="font-semibold mb-2 text-sm leading-snug" style={{ color: 'var(--ink)' }}>{p.title}</h3>
                        <div className="flex items-end justify-between gap-2 flex-wrap">
                          <div className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                            ₱{p.price.toLocaleString()}
                          </div>
                          <div className="font-mono text-xs" style={{ color: 'var(--teal-dark)' }}>as low as {p.mo}</div>
                        </div>
                      </div>
                    </Link>
                    <div className="p-5 pt-2">
                      <Link href={`/products/${p.slug}`} className="finance-btn">
                        View & finance →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                {isSearching ? (
                  <>
                    <p className="font-display text-xl mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                      No matches for "{search.trim()}"
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>
                      Try a different keyword or browse all categories.
                    </p>
                    <button
                      onClick={() => { setSearch(''); setCategory('All') }}
                      className="text-sm font-semibold"
                      style={{ color: 'var(--teal-dark)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No items in this category yet.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}