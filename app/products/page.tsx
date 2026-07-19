'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import FinancingOptions from '@/components/FinancingOptions'

const CATEGORIES = ['All', 'Gadgets', 'Appliances', 'Furniture'] as const

// FIX: tags now match CATEGORIES exactly (title case) — no case-folding needed
// FIX: replaced broken "photo-1washer" and duplicate "1844bbd07222" Unsplash IDs
const PRODUCTS = [
  { src: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800', tag: 'Gadgets',    title: 'Samsung Galaxy A55 5G',         price: 18999, mo: '₱1,650/mo', popular: true  },
  { src: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800', tag: 'Gadgets',    title: 'MacBook Air M2',                 price: 58999, mo: '₱4,850/mo', popular: true  },
  { src: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?q=80&w=800', tag: 'Gadgets',    title: 'iPad 10th Gen',                  price: 21999, mo: '₱1,920/mo', popular: false },
  { src: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=800', tag: 'Gadgets',    title: 'Sony WH-1000XM5',                price: 17999, mo: '₱1,570/mo', popular: false },
  { src: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=800', tag: 'Appliances', title: '2-Door Refrigerator',            price: 24999, mo: '₱2,180/mo', popular: true  },
  { src: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=800', tag: 'Appliances', title: 'Front-Load Washing Machine',     price: 27999, mo: '₱2,440/mo', popular: false },
  { src: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=800', tag: 'Appliances', title: 'Split-Type Air Conditioner',     price: 32999, mo: '₱2,870/mo', popular: false },
  { src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800', tag: 'Furniture',  title: '3-Seater Sofa',                  price: 22999, mo: '₱2,000/mo', popular: false },
  { src: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800', tag: 'Furniture',  title: 'Queen Bed Frame + Mattress',     price: 26999, mo: '₱2,350/mo', popular: true  },
]

export default function ProductsPage() {
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ price: number; title: string; src: string } | null>(null)

  // QoL: count per category for pill badges
  const categoryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { All: PRODUCTS.length }
    for (const cat of CATEGORIES.slice(1)) {
      counts[cat] = PRODUCTS.filter(p => p.tag === cat).length
    }
    return counts
  }, [])

  const filtered = useMemo(() => {
    // FIX: exact match now that tags are title-cased to match CATEGORIES
    let results = category === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.tag === category)
    // QoL: search filter
    const q = search.trim().toLowerCase()
    if (q) results = results.filter(p => p.title.toLowerCase().includes(q))
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

        /* QoL: category pill with count badge */
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

        /* QoL: search input */
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

        /* QoL: popular badge */
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
          transition:all 0.15s ease; font-family:'Inter',sans-serif;
        }
        .finance-btn:hover { transform:translate(-1px,-1px); box-shadow:3px 3px 0 var(--ink); }
        .finance-btn:active { transform:translate(1px,1px); box-shadow:1px 1px 0 var(--ink); }

        /* QoL: grid fade-in on filter change */
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

        {/* Sticky filter bar with search */}
        <section
          className="py-4 px-6"
          style={{
            borderBottom: '1px solid var(--line)', position: 'sticky', top: 0,
            background: 'var(--paper)', zIndex: 10,
            boxShadow: '0 2px 8px rgba(20,17,15,0.04)',
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            {/* Category pills with count badges */}
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

            {/* QoL: search box */}
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
                onChange={e => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </section>

        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">

            {/* QoL: results count + context */}
            <p className="font-mono text-xs mb-6" style={{ color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
              {isSearching
                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search.trim()}"${category !== 'All' ? ` in ${category}` : ''}`
                : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}${category !== 'All' ? ` · ${category}` : ''}`
              }
            </p>

            {filtered.length > 0 ? (
              <div className="product-grid grid sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <div key={p.title} className="card overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="relative h-44">
                        {/* FIX: added sizes prop to silence Next.js Image warnings */}
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
                          {/* QoL: popular badge */}
                          {p.popular && (
                            <span className="popular-badge">★ Popular</span>
                          )}
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
                    </div>
                    <div className="p-5 pt-2">
                      <button
                        onClick={() => setSelected({ price: p.price, title: p.title, src: p.src })}
                        className="finance-btn"
                      >
                        Finance this item →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* QoL: contextual empty state */
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

        {selected && (
          <FinancingOptions
            price={selected.price}
            purpose={selected.title}
            imageSrc={selected.src}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </>
  )
}