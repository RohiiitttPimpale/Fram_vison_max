import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapLocationPickerProps {
  onLocationSelect: (location: string, lat: number, lng: number) => void;
  initialLocation?: string;
  initialLat?: number;
  initialLng?: number;
}

interface ClickHandler {
  (e: L.LeafletMouseEvent): void;
}

const MapClickHandler = ({ onMapClick }: { onMapClick: ClickHandler }) => {
  useMapEvents({
    click: onMapClick,
  });
  return null;
};

export const MapLocationPicker = ({
  onLocationSelect,
  initialLocation,
  initialLat = 20.5937,
  initialLng = 78.9629,
}: MapLocationPickerProps) => {
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>([initialLat, initialLng]);
  const [searchInput, setSearchInput] = useState(initialLocation || "");
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setSelectedPosition([lat, lng]);
    updateMarker(lat, lng);
    reverseGeocode(lat, lng);
  };

  const updateMarker = (lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const locationName = data.address?.city || data.address?.town || data.address?.village || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setSearchInput(locationName);
      onLocationSelect(locationName, lat, lng);
    } catch (error) {
      setSearchInput(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      onLocationSelect(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng);
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setSelectedPosition([newLat, newLng]);
        updateMarker(newLat, newLng);

        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], 13);
        }

        onLocationSelect(searchInput, newLat, newLng);
      }
    } catch (error) {
      console.error("Error searching location:", error);
    }
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedPosition([latitude, longitude]);
          updateMarker(latitude, longitude);

          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 13);
          }

          reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search location or city name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button size="sm" onClick={handleSearch} variant="outline">
          Search
        </Button>
      </div>

      <Button
        size="sm"
        onClick={handleUseCurrentLocation}
        variant="outline"
        className="w-full"
      >
        <MapPin size={14} className="mr-2" />
        Use Current Location
      </Button>

      <div className="rounded-lg overflow-hidden border border-border h-64">
        <MapContainer
          center={selectedPosition}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={selectedPosition}
            ref={markerRef}
          >
            <Popup>
              Selected Location: <br /> Lat: {selectedPosition[0].toFixed(4)}, Lng: {selectedPosition[1].toFixed(4)}
            </Popup>
          </Marker>
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Click on map to select location, or search by city name
      </p>
    </div>
  );
};

export default MapLocationPicker;
