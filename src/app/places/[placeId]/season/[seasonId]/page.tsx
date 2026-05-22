import SeasonWorkspaceView from './SeasonWorkspaceView'

export default async function SeasonWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string; seasonId: string }>
  searchParams: Promise<{ apiPlaceId?: string }>
}) {
  const { placeId, seasonId } = await params
  const { apiPlaceId } = await searchParams

  return <SeasonWorkspaceView placeId={placeId} seasonId={seasonId} apiPlaceId={apiPlaceId || ''} />
}
