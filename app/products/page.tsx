// app/products/page.tsx
'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import FinancingOptions from '@/components/FinancingOptions'

const CATEGORIES = ['All', 'Gadgets', 'Appliances', 'Furniture'] as const

const PRODUCTS = [
  { src: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800', tag: 'GADGETS', title: 'Samsung Galaxy A55 5G', price: 18999, mo: '₱1,650/mo' },
  { src: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800', tag: 'GADGETS', title: 'MacBook Air M2', price: 58999, mo: '₱4,850/mo' },
  { src: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?q=80&w=800', tag: 'GADGETS', title: 'iPad 10th Gen', price: 21999, mo: '₱1,920/mo' },
  { src: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=800', tag: 'GADGETS', title: 'Sony WH-1000XM5', price: 17999, mo: '₱1,570/mo' },
  { src: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=800', tag: 'APPLIANCES', title: '2-Door Refrigerator', price: 24999, mo: '₱2,180/mo' },
  { src: 'https://images.unsplash.com/photo-1washer?q=80&w=800', tag: 'APPLIANCES', title: 'Front-Load Washing Machine', price: 27999, mo: '₱2,440/mo' },
  { src: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=800', tag: 'APPLIANCES', title: 'Split-Type Air Conditioner', price: 32999, mo: '₱2,870/mo' },
  { src: 'https://images.unsplash.com/photo-1631679706909-1844bbd07222?q=80&w=800', tag: 'FURNITURE', title: '3-Seater Sofa', price: 22999, mo: '₱2,000/mo' },
  { src: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800', tag: 'FURNITURE', title: 'Queen Bed Frame + Mattress', price: 26999, mo: '₱2,350/mo' },
]

export default function ProductsPage() {
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('All')
  const [selected, setSelected] = useState<{ price: number; title: string; src: string } | null>(null)

  const filtered = useMemo(() => {
    if (category === 'All') return PRODUCTS
    return PRODUCTS.filter(p => p.tag.toLowerCase() === category.toLowerCase())
  }, [category])

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
        .font-mono { font-family:'Space Mono',monospace; }

        .card { background:var(--card); border:1px solid var(--line); border-radius:12px;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          box-shadow: 0 2px 8px rgba(20,17,15,0.04), 0 1px 2px rgba(20,17,15,0.03); }
        .card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(20,17,15,0.09), 0 2px 8px rgba(20,17,15,0.04); border-color: var(--line-md); }

        .section-tag { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:9999px;
          background:var(--teal-bg); border:1px solid var(--teal-bdr); color:var(--teal-dark); font-size:11px;
          font-weight:700; text-transform:uppercase; letter-spacing:0.1em; font-family:'Space Mono',monospace; }

        .cat-pill { font-family:'Space Mono',monospace; font-size:12px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.05em; padding:8px 16px; border-radius:9999px; border:1.5px solid var(--line-md);
          background:var(--card); color:var(--ink-3); transition:all 0.15s ease; cursor:pointer; }
        .cat-pill:hover { border-color:var(--teal); color:var(--teal-dark); }
        .cat-pill.active { background:var(--teal-dark); border-color:var(--teal-dark); color:#fff; }
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

        <section className="py-8 px-6" style={{ borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 10 }}>
          <div className="max-w-6xl mx-auto flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`cat-pill ${category === c ? 'active' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            {filtered.length > 0 ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <div key={p.title} className="card overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="relative h-44">
                        <Image src={p.src} alt={p.title} fill className="object-cover" />
                        <div className="absolute top-3 left-3">
                          <span className="font-mono text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--teal-dark)', border: '1px solid var(--teal-bdr)', backdropFilter: 'blur(8px)' }}>
                            {p.tag}
                          </span>
                        </div>
                      </div>
                      <div className="p-5 pb-3">
                        <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--ink)' }}>{p.title}</h3>
                        <div className="flex items-end justify-between">
                          <div className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                            ₱{p.price.toLocaleString()}
                          </div>
                          <div className="font-mono text-xs" style={{ color: 'var(--teal-dark)' }}>as low as {p.mo}</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 pt-0">
                      <button
                        onClick={() => setSelected({ price: p.price, title: p.title, src: p.src })}
                        className="w-full text-center text-sm font-medium py-2.5 rounded-lg transition-all"
                        style={{ background: 'var(--teal-dark)', color: 'white' }}
                      >
                        Finance this item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No items in this category yet.</p>
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