export interface Point {
  lat: number
  lng: number
}

export interface CampaignArea {
  id: string
  name: string
  description?: string
  polygon: [number, number][]
  pointOfInterests?: PointOfInterest[]
}

export interface PointOfInterest {
  id: string
  latitude: number
  longitude: number
  radius: number
  name: string
  description?: string
  tasks?: Task[]
}

export interface Task {
  id: string
  title: string
  description?: string
}

export interface CampaignData {
  id: string
  name: string
  areas: CampaignArea[]
}

export interface PolygonData {
  id: string
  name: string
  description?: string
  coordinates: [number, number][]
  polygon: [number, number][]
}
