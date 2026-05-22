import SectionHeader from '@/components/ui/SectionHeader'
import PlaceNonInventoryReports from './PlaceNonInventoryReports'

export default function PlaceReportsView({
  placeId,
  placeName,
}: {
  placeId: string
  placeName?: string
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionHeader
        title="Place Management / Reports"
      />
      <PlaceNonInventoryReports placeId={placeId} placeName={placeName} />
    </div>
  )
}
