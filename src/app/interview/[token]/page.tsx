import type { Metadata } from "next";
import InterviewInvullen from "@/components/interviewmodule/InterviewInvullen";

export const dynamic = "force-dynamic";

// Persoonlijke interviewlink. Niet indexeren en de link niet doorgeven via de Referer-header.
export const metadata: Metadata = {
  title: "Interview profielwerkstuk",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function InterviewPagina({ params }: PageProps<"/interview/[token]">) {
  const { token } = await params;
  return <InterviewInvullen token={token} />;
}
