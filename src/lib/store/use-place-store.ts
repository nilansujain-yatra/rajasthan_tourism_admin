'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlaceState {
  selectedPlace: any | null
  setSelectedPlace: (place: any) => void
}

export const usePlaceStore = create<PlaceState>()(
  persist(
    (set) => ({
      selectedPlace: null,
      setSelectedPlace: (place) => set({ selectedPlace: place }),
    }),
    {
      name: 'place-storage',
    }
  )
)
