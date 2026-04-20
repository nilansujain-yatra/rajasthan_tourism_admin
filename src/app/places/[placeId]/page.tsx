import PlaceDetailsView from './PlaceDetailsView'

export default function PlaceDetailsPage({ params }: { params: { placeId: string } }) {
  return <PlaceDetailsView placeId={params.placeId} />
}
