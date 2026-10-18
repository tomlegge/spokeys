import { LayersControl, TileLayer } from "react-leaflet";

const OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Drawn-map styles get the dark-mode invert filter (see styles.css);
// satellite imagery doesn't, as inverting a photo makes it unreadable.
const INVERT = "basemap-invert";

export type BaseLayerName = "Cycle map" | "Street" | "Light" | "Topo" | "Satellite";

const LAYERS: { name: BaseLayerName; url: string; attribution: string; maxZoom: number; className?: string }[] = [
  {
    name: "Cycle map",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    attribution: `${OSM}, <a href="https://www.cyclosm.org">CyclOSM</a>`,
    maxZoom: 20,
    className: INVERT,
  },
  {
    name: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM,
    maxZoom: 19,
    className: INVERT,
  },
  {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: `${OSM}, &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    maxZoom: 20,
    className: INVERT,
  },
  {
    name: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: `${OSM}, &copy; <a href="https://opentopomap.org">OpenTopoMap</a>`,
    maxZoom: 17,
    className: INVERT,
  },
  {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
];

export default function BaseLayers({ defaultLayer = "Cycle map" }: { defaultLayer?: BaseLayerName }) {
  return (
    <LayersControl position="topleft">
      {LAYERS.map((l) => (
        <LayersControl.BaseLayer key={l.name} name={l.name} checked={l.name === defaultLayer}>
          <TileLayer url={l.url} attribution={l.attribution} maxZoom={l.maxZoom} className={l.className} />
        </LayersControl.BaseLayer>
      ))}
    </LayersControl>
  );
}
