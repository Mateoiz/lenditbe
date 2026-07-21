'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, useRouter, useSearchParams } from 'next/navigation'
import FinancingOptions from '@/components/FinancingOptions'
import { getProductBySlug, getRelatedProducts } from '@/lib/products'
import { createClient } from '@/lib/supabase/client'

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const product = getProductBySlug(slug)
  if (!product) notFound()

const router = useRouter()
  const searchParams = useSearchParams()
  const [color, setColor] = useState(product.colors?.[0]?.name ?? null)
  const [specIndex, setSpecIndex] = useState(0)
  const [financing, setFinancing] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
      // Auto-open modal if redirected back here after login
      if (session && searchParams.get('finance') === '1') {
        setFinancing(true)
        // Clean the URL without reloading
        router.replace(`/products/${slug}`, { scroll: false })
      }
    })
  }, [])

  function handleFinanceClick() {
    if (authed) {
      setFinancing(true)
    } else {
      router.push(`/login?next=/products/${slug}?finance=1`)
    }
  }   

  const activeSpec = product.specs?.[specIndex]
  const price = product.price + (activeSpec?.priceDelta ?? 0)
  const mo = activeSpec?.mo ?? product.mo

const activeColor = product.colors?.find(c => c.name === color)

  const related = useMemo(() => getRelatedProducts(product), [product])

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
          --line:rgba(20,17,15,0.10); --line-md:rgba(20,17,15,0.18);
        }
        body { font-family:'Inter',-apple-system,sans-serif; }
        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono   { font-family:'Space Mono',monospace; }

        .opt-pill {
          font-family:'Inter',sans-serif; font-size:13px; font-weight:600;
          padding:10px 16px; border-radius:8px; border:1.5px solid var(--line-md);
          background:var(--card); color:var(--ink-2); cursor:pointer; text-align:left;
          transition: all 0.15s ease;
        }
        .opt-pill:hover { border-color:var(--teal); }
        .opt-pill.active { border-color:var(--teal-dark); background:var(--teal-bg); color:var(--teal-dark); box-shadow: inset 0 0 0 1px var(--teal-dark); }
        .opt-pill .sub { display:block; font-size:11px; color:var(--ink-4); margin-top:2px; }
        .opt-pill.active .sub { color:var(--teal-dark); }

        .swatch {
          width:34px; height:34px; border-radius:50%; cursor:pointer; position:relative;
          border:2px solid var(--card); box-shadow: 0 0 0 1.5px var(--line-md);
          transition: box-shadow 0.15s ease;
        }
        .swatch.active { box-shadow: 0 0 0 2px var(--teal-dark); }

        .finance-btn {
          font-size:14px; font-weight:700; padding:14px 20px;
          border-radius:6px; border:1.5px solid var(--ink); box-shadow:3px 3px 0 var(--ink);
          background:var(--teal-dark); color:white; cursor:pointer;
          transition:all 0.15s ease; font-family:'Inter',sans-serif;
        }
        .finance-btn:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .finance-btn:active { transform:translate(1px,1px); box-shadow:1px 1px 0 var(--ink); }

        .related-card {
          background:var(--card); border:1px solid var(--line); border-radius:12px;
          overflow:hidden; text-decoration:none; display:block;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .related-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(20,17,15,0.08); }
      `}</style>

      <div style={{ background: 'var(--paper)', color: 'var(--ink)' }} className="min-h-screen">

        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}
        >
 <Link href="/dashboard" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Lendit
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: '50%', background: 'var(--marigold)',
              color: 'var(--teal-dark)', fontSize: 15, fontWeight: 700, marginLeft: 2,
              border: '1.5px solid var(--ink)', verticalAlign: 'middle',
            }}>Be</span>
          </Link>
          <Link href="/products" className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>
            ← Back to catalogue
          </Link>
        </header>

        <section className="py-10 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">

            {/* Image */}
            <div>
              <div className="relative w-full" style={{ aspectRatio: '1 / 1', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <Image
                  src={product.src}
                  alt={product.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                {activeColor && (
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      background: activeColor.hex,
                      mixBlendMode: 'multiply',
                      opacity: 0.35,
                      transition: 'background 0.3s ease, opacity 0.3s ease',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {activeColor && (
                  <div
                    style={{
                      position: 'absolute', bottom: 12, left: 12,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 20,
                      background: 'rgba(255,253,247,0.88)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(20,17,15,0.12)',
                      fontSize: 11, fontWeight: 600,
                      fontFamily: 'Space Mono, monospace',
                      color: 'var(--ink-2)',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: activeColor.hex,
                      border: '1px solid rgba(20,17,15,0.2)',
                      flexShrink: 0,
                    }} />
                    {activeColor.name}
                  </div>
                )}
</div>
            </div>

            {/* Details */}
            <div>
              <span
                className="font-mono text-xs px-2.5 py-1 rounded-lg inline-block mb-3"
                style={{ background: 'var(--teal-bg)', color: 'var(--teal-dark)', border: '1px solid var(--teal-bdr)' }}
              >
                {product.tag}
              </span>
              <h1 className="font-display mb-2" style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 500 }}>
                {product.title}
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>{product.description}</p>

              <div className="mb-6">
                <div className="font-display text-3xl" style={{ fontWeight: 500 }}>₱{price.toLocaleString()}</div>
                <div className="font-mono text-sm mt-1" style={{ color: 'var(--teal-dark)' }}>or {mo} for 24 mos.</div>
              </div>

              {product.colors && (
                <div className="mb-6">
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>
                    Color — {color}
                  </div>
                  <div className="flex items-center gap-3">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        aria-label={c.name}
                        onClick={() => setColor(c.name)}
                        className={`swatch ${color === c.name ? 'active' : ''}`}
                        style={{ background: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {product.specs && (
                <div className="mb-8">
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Configuration</div>
                  <div className="grid gap-2">
                    {product.specs.map((s, i) => (
                      <button
                        key={s.label}
                        onClick={() => setSpecIndex(i)}
                        className={`opt-pill ${specIndex === i ? 'active' : ''}`}
                      >
                        {s.label}
                        <span className="sub">as low as {s.mo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
<button onClick={handleFinanceClick} className="finance-btn" disabled={authed === null}>
                  {authed === null ? 'Loading…' : 'Finance this item →'}
                </button>
                <span className="text-xs" style={{ color: 'var(--ink-4)' }}>No cash upfront beyond your down payment</span>
              </div>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="py-12 px-6" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="max-w-5xl mx-auto">
              <h2 className="font-display text-xl mb-5" style={{ fontWeight: 500 }}>You might also like</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {related.map((p) => (
                  <Link key={p.slug} href={`/products/${p.slug}`} className="related-card">
                    <div className="relative h-32">
                      <Image src={p.src} alt={p.title} fill className="object-cover" sizes="33vw" />
                    </div>
                    <div className="p-4">
                      <div className="text-sm font-semibold mb-1">{p.title}</div>
                      <div className="font-mono text-xs" style={{ color: 'var(--teal-dark)' }}>as low as {p.mo}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {financing && (
        <FinancingOptions
          price={price}
          purpose={`${product.title}${color ? ` — ${color}` : ''}`}
          imageSrc={product.src}
          onClose={() => setFinancing(false)}
        />
      )}
    </>
  )
}