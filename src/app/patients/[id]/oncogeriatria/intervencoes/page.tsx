import { redirect } from "next/navigation";
import { requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

export default async function OncogeriatricInterventionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  const suffix = episode ? `?episode=${encodeURIComponent(episode.id)}` : "";
  redirect(`/patients/${encodeURIComponent(patientId)}/oncogeriatria/escalas${suffix}`);
}
