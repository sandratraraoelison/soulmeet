"use client";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
type SearchResult = { type: "user" | "report"; id: string; title: string; subtitle: string; href: string };
export function GlobalSearch() {
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false); const [selected, setSelected] = useState(0); const inputRef = useRef<HTMLInputElement>(null); const debounced = useDebouncedValue(query.trim());
  const results = useQuery({ queryKey: ["global-search", debounced], queryFn: ({ signal }) => api<SearchResult[]>(`admin/search?q=${encodeURIComponent(debounced)}`, { signal }), enabled: debounced.length >= 2, staleTime: 10_000 });
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); inputRef.current?.focus(); setOpen(true); } }; document.addEventListener("keydown", shortcut); return () => document.removeEventListener("keydown", shortcut); }, []);
  const items = results.data ?? [];
  const close = () => { setOpen(false); setQuery(""); setSelected(0); };
  return <div className="search-container"><label><Search size={16} style={{ position: "absolute", margin: 12 }} /><input ref={inputRef} className="search" aria-label="Global search" placeholder="Search people and reports…  Ctrl K" style={{ paddingLeft: 36 }} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); setSelected(0); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") close(); if (event.key === "ArrowDown") { event.preventDefault(); setSelected((value) => Math.min(value + 1, items.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setSelected((value) => Math.max(value - 1, 0)); } if (event.key === "Enter" && items[selected]) { event.preventDefault(); window.location.assign(items[selected].href); } }} /></label>{open && debounced.length >= 2 && <div className="search-results" role="listbox">{results.isLoading ? <div className="state">Searching…</div> : results.error ? <div className="error">{results.error.message}</div> : !items.length ? <div className="state">No results found</div> : items.map((result, index) => <Link className={`search-result ${index === selected ? "active" : ""}`} href={result.href} key={`${result.type}-${result.id}`} role="option" aria-selected={index === selected} onMouseEnter={() => setSelected(index)} onClick={close}><strong>{result.title}</strong><span className="muted">{result.subtitle}</span><small className="muted">{result.type}</small></Link>)}</div>}</div>;
}
