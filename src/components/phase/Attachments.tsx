"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/types";

export default function Attachments({ phaseId, initial }: { phaseId: string; initial: Attachment[] }) {
  const [items, setItems] = useState<Attachment[]>(initial);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    const l = label.trim();
    let u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    setLabel("");
    setUrl("");
    const { data } = await supabase
      .from("pws_attachments")
      .insert({ phase_id: phaseId, kind: "link", label: l || u, url: u })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as Attachment]);
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const path = `${user?.id ?? "anon"}/${phaseId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("pws-files").upload(path, file);
    if (!error) {
      const { data } = await supabase
        .from("pws_attachments")
        .insert({ phase_id: phaseId, kind: "file", label: file.name, storage_path: path })
        .select()
        .single();
      if (data) setItems((prev) => [...prev, data as Attachment]);
    } else {
      alert("Uploaden mislukt: " + error.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function openFile(a: Attachment) {
    if (!a.storage_path) return;
    const { data } = await supabase.storage.from("pws-files").createSignedUrl(a.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function remove(a: Attachment) {
    setItems((prev) => prev.filter((i) => i.id !== a.id));
    if (a.kind === "file" && a.storage_path) {
      await supabase.storage.from("pws-files").remove([a.storage_path]);
    }
    await supabase.from("pws_attachments").delete().eq("id", a.id);
  }

  return (
    <div>
      <ul className="space-y-1.5">
        {items.map((a) => (
          <li key={a.id} className="group flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-slate-400">{a.kind === "file" ? "📎" : "🔗"}</span>
            {a.kind === "link" ? (
              <a href={a.url ?? "#"} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm text-sky-700 hover:underline">
                {a.label}
              </a>
            ) : (
              <button onClick={() => openFile(a)} className="flex-1 truncate text-left text-sm text-slate-700 hover:underline">
                {a.label}
              </button>
            )}
            <button
              onClick={() => remove(a)}
              className="opacity-0 transition group-hover:opacity-100 text-slate-300 hover:text-red-500"
              aria-label="Verwijderen"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-slate-400">Nog geen bijlagen of links.</li>}
      </ul>

      <form onSubmit={addLink} className="mt-3 flex flex-wrap gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Naam (optioneel)"
          className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link plakken…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
        />
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
          Link toevoegen
        </button>
      </form>

      <div className="mt-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600">
          {uploading ? "Uploaden…" : "📁 Bestand uploaden"}
          <input ref={fileRef} type="file" onChange={upload} disabled={uploading} className="hidden" />
        </label>
      </div>
    </div>
  );
}
