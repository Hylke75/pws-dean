"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { naarHtml } from "@/lib/opmaak";

type Knop = { label: string; titel: string; actief: string | [string, Record<string, unknown>]; doe: () => void; stijl?: string };

/** Schrijfvak met opmaak: vet, cursief, onderstrepen, opsomming, nummering en tussenkop. */
export default function TekstEditor({
  waarde,
  onChange,
  onBlur,
}: {
  waarde: string;
  onChange: (html: string) => void;
  onBlur: () => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [3] }, link: false, code: false, codeBlock: false, horizontalRule: false })],
    content: naarHtml(waarde),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "verslag-tekst min-h-64 px-3 py-2.5 text-sm text-slate-800 outline-none",
        "aria-label": "Schrijfvak",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    onBlur: () => onBlur(),
  });

  const actief = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            bulletList: editor.isActive("bulletList"),
            orderedList: editor.isActive("orderedList"),
            heading: editor.isActive("heading", { level: 3 }),
            blockquote: editor.isActive("blockquote"),
          }
        : null,
  });

  // Tekst die van buitenaf wordt gezet (bijv. "Begin met wat al in het systeem staat").
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const html = naarHtml(waarde);
    if (html !== (editor.isEmpty ? "" : editor.getHTML())) editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, waarde]);

  if (!editor) {
    return <div className="min-h-72 rounded-lg border border-slate-200 bg-white" />;
  }

  const c = () => editor.chain().focus();
  const knoppen: (Knop & { aan: boolean })[] = [
    { label: "B", titel: "Vet", actief: "bold", doe: () => c().toggleBold().run(), stijl: "font-bold", aan: !!actief?.bold },
    { label: "I", titel: "Cursief", actief: "italic", doe: () => c().toggleItalic().run(), stijl: "italic", aan: !!actief?.italic },
    { label: "U", titel: "Onderstrepen", actief: "underline", doe: () => c().toggleUnderline().run(), stijl: "underline", aan: !!actief?.underline },
    { label: "Kop", titel: "Tussenkop", actief: "heading", doe: () => c().toggleHeading({ level: 3 }).run(), stijl: "font-semibold", aan: !!actief?.heading },
    { label: "• Lijst", titel: "Opsomming", actief: "bulletList", doe: () => c().toggleBulletList().run(), aan: !!actief?.bulletList },
    { label: "1. Lijst", titel: "Genummerde lijst", actief: "orderedList", doe: () => c().toggleOrderedList().run(), aan: !!actief?.orderedList },
    { label: "❝ Citaat", titel: "Citaat", actief: "blockquote", doe: () => c().toggleBlockquote().run(), aan: !!actief?.blockquote },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-emerald-500">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        {knoppen.map((k) => (
          <button
            key={k.titel}
            type="button"
            title={k.titel}
            onMouseDown={(e) => e.preventDefault()}
            onClick={k.doe}
            className={`rounded-md px-2.5 py-1 text-sm transition ${k.stijl ?? ""} ${
              k.aan ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {k.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button type="button" title="Ongedaan maken" onMouseDown={(e) => e.preventDefault()} onClick={() => c().undo().run()} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-200">
          ↶
        </button>
        <button type="button" title="Opnieuw" onMouseDown={(e) => e.preventDefault()} onClick={() => c().redo().run()} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-200">
          ↷
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
