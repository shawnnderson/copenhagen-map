import { TileLayer } from 'react-leaflet'

/**
 * Esri's Light Gray Canvas: a genuinely low-ink basemap, keyless, and raster —
 * so it needs no WebGL and no tile worker.
 *
 * It ships as two layers: a base with almost no labels, and a reference layer
 * carrying just place names and major roads. Splitting them is what keeps the
 * map quiet — the ground stays nearly empty while labels stay crisp.
 *
 * (Vector Positron via MapLibre would be closer still, but its tile worker
 * doesn't run reliably in every browser, and a basemap that might come up
 * blank is worse than one that's a shade busier.)
 */
const BASE =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const LABELS =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'

export default function BaseLayer() {
  return (
    <>
      <TileLayer url={BASE} maxZoom={18} maxNativeZoom={16} attribution="Tiles &copy; Esri" />
      <TileLayer url={LABELS} maxZoom={18} maxNativeZoom={16} pane="overlayPane" />
    </>
  )
}
