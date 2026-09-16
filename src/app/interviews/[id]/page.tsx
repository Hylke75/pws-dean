import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InterviewDetail from "@/components/interview/InterviewDetail";
import type { Interview, InterviewItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InterviewPage({ params }: PageProps<"/interviews/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: interview } = await supabase.from("pws_interviews").select("*").eq("id", id).single();
  if (!interview) notFound();

  const [{ data: items }, { data: phases }] = await Promise.all([
    supabase.from("pws_interview_items").select("*").eq("interview_id", id).order("order_index"),
    supabase.from("pws_phases").select("id, order_index, title").order("order_index"),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/interviews" className="text-sm text-slate-500 hover:text-slate-800">
        ← Terug naar interviews
      </Link>
      <div className="mt-4">
        <InterviewDetail
          interview={interview as Interview}
          initialItems={(items as InterviewItem[]) ?? []}
          phases={(phases as { id: string; order_index: number; title: string }[]) ?? []}
        />
      </div>
    </main>
  );
}
