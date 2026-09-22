import { redirect } from "next/navigation";
import { buildOncogeriatricCargHref } from "@/domain/oncogeriatria/return-navigation";
import { loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

export default async function LegacyCargPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string; checkpoint?: string; consultation?: string }>;
}) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) redirect(`/patients/${encodeURIComponent(patientId)}/oncogeriatria`);
  redirect(buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: query.checkpoint, consultationId: query.consultation }));
}
