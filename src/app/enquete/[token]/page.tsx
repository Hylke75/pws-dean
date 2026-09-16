import EnqueteInvullen from "@/components/enquete/EnqueteInvullen";

export const dynamic = "force-dynamic";

export default async function PublicEnquete({ params }: PageProps<"/enquete/[token]">) {
  const { token } = await params;
  return <EnqueteInvullen token={token} />;
}
