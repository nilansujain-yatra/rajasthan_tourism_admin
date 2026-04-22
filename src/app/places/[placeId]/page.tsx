import PlaceDetailsView from './PlaceDetailsView'

export default async function PlaceDetailsPage({
  params,
}: {
  params: Promise<{ placeId: string }>
}) {
  const { placeId } = await params

  return <PlaceDetailsView placeId={placeId} />
}