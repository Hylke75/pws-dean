import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EnqueteInvullen from "@/components/enquete/EnqueteInvullen";

export const dynamic = "force-dynamic";

// Korte, deelbare link: /e/leerlingen, /e/docenten, /e/werkenden
export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("pws_enquete_public", { p_token: slug });
  const s = data as { title: string } | null;
  return {
    title: s ? s.title : "Enquête",
    description: "Anonieme enquête voor een profielwerkstuk. Invullen duurt ongeveer 4 minuten.",
    robots: { index: false },
  };
}

export default async function KorteEnquete({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  return <EnqueteInvullen token={slug} />;
}
