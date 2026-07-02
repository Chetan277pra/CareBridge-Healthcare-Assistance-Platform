import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerProps {
  apiKey?: string; // Kept in interface for backward compatibility, not used
  label: string;
  query: string;
  latitude: number | null;
  longitude: number | null;
  onQueryChange: (value: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  className?: string;
}

// Custom SVG marker for the patient (Blue)
const createSVGIcon = (color: string) => {
  return new L.DivIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" style="filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.45));">
             <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
           </svg>`,
    className: "custom-leaflet-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const patientIcon = createSVGIcon("#3b82f6"); // Blue

// Helper component to handle click events on the Leaflet map
const MapEventsHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Helper component to dynamically pan/zoom map when coordinates change
const MapViewUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Fallback Geocoding Search: Try France Mirror, then Main Nominatim, then Photon
const searchLocations = async (query: string): Promise<any[]> => {
  // 1. Try OpenStreetMap France Nominatim first
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.fr/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
    );
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("OSM France search failed, trying OSM main...", err);
  }

  // 2. Try OpenStreetMap Main Nominatim second
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&email=carebridge-dev@carebridge-app.com`
    );
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("OSM Main search failed, trying Photon...", err);
  }

  // 3. Fallback to Komoot Photon API third
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.features) {
        return data.features.map((f: any) => {
          const props = f.properties;
          const coords = f.geometry.coordinates; // [lng, lat]
          const parts = [
            props.name,
            props.street,
            props.city || props.town || props.village,
            props.state,
            props.country
          ].filter(Boolean);
          return {
            lat: coords[1].toString(),
            lon: coords[0].toString(),
            display_name: parts.join(", "),
          };
        });
      }
    }
  } catch (err) {
    console.error("All geocoding services failed:", err);
  }

  return [];
};

// Fallback Reverse Geocoding: Try France Mirror, then Main Nominatim, then Photon
const reverseGeocodeLocation = async (lat: number, lon: number): Promise<string | null> => {
  // 1. Try OpenStreetMap France Nominatim first
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.fr/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) return data.display_name;
    }
  } catch (err) {
    console.warn("OSM France reverse geocode failed, trying OSM main...", err);
  }

  // 2. Try OpenStreetMap Main Nominatim second
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&email=carebridge-dev@carebridge-app.com`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) return data.display_name;
    }
  } catch (err) {
    console.warn("OSM Main reverse geocode failed, trying Photon...", err);
  }

  // 3. Fallback to Komoot Photon API third
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const props = data.features[0].properties;
        const parts = [
          props.name,
          props.street,
          props.city || props.town || props.village,
          props.state,
          props.country
        ].filter(Boolean);
        return parts.join(", ");
      }
    }
  } catch (err) {
    console.error("All reverse geocoding services failed:", err);
  }

  return null;
};

const LocationPicker = ({
  label,
  query,
  latitude,
  longitude,
  onQueryChange,
  onCoordinatesChange,
  className = "",
}: LocationPickerProps) => {
  const inputId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const debounceRef = useRef<any>(null);

  // Default map center to India if coordinates not selected
  const [center, setCenter] = useState<[number, number]>(
    latitude !== null && longitude !== null ? [latitude, longitude] : [20.5937, 78.9629]
  );
  const [zoom, setZoom] = useState<number>(latitude !== null && longitude !== null ? 15 : 6);

  // Setup geolocation if no coordinates are initially loaded
  useEffect(() => {
    if (latitude === null || longitude === null) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            onCoordinatesChange(lat, lon);
            setCenter([lat, lon]);
            setZoom(15);
            reverseGeocode(lat, lon);
          },
          () => {
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    } else {
      setCenter([latitude, longitude]);
      setZoom(15);
      setLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const address = await reverseGeocodeLocation(lat, lon);
      if (address) {
        onQueryChange(address);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    onCoordinatesChange(lat, lng);
    setCenter([lat, lng]);
    setZoom(15);
    reverseGeocode(lat, lng);
  };

  // Autocomplete suggestion fetch with 600ms debouncing and multi-service fallbacks
  const handleQueryChange = (val: string) => {
    onQueryChange(val);
    if (val.length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(val);
        setSuggestions(results);
      } catch (err) {
        // Ignore autocomplete query failures
      }
    }, 600);
  };

  const handleSelectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    onQueryChange(item.display_name);
    onCoordinatesChange(lat, lon);
    setSuggestions([]);
    setCenter([lat, lon]);
    setZoom(15);
    setError(null);
  };

  const handleSearch = async () => {
    if (!query) {
      setError("Enter a location and try again.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const results = await searchLocations(query);
      if (results && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        onQueryChange(item.display_name);
        onCoordinatesChange(lat, lon);
        setCenter([lat, lon]);
        setZoom(15);
      } else {
        setError("Address not found. Try another search term.");
      }
    } catch (err) {
      console.error(err);
      setError("Search request failed. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // Draggable marker handlers
  const markerRef = useRef<any>(null);
  const markerEvents = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onCoordinatesChange(latLng.lat, latLng.lng);
          setCenter([latLng.lat, latLng.lng]);
          reverseGeocode(latLng.lat, latLng.lng);
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">{label}</label>
          <span className="text-xs text-slate-500">Drag the pin or click on map.</span>
        </div>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setError(null);
              handleQueryChange(e.target.value);
            }}
            placeholder="Search address or landmark"
            className="flex-1 rounded-3xl border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="rounded-3xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="absolute top-[72px] left-0 right-0 z-[1000] bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                className="px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
              >
                {item.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
          <div className="font-semibold">Latitude</div>
          <div>{latitude !== null ? latitude.toFixed(6) : "Not selected"}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
          <div className="font-semibold">Longitude</div>
          <div>{longitude !== null ? longitude.toFixed(6) : "Not selected"}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-300 bg-slate-100 z-0 relative" style={{ minHeight: 400 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventsHandler onClick={handleMapClick} />
          <MapViewUpdater center={center} zoom={zoom} />
          {latitude !== null && longitude !== null && (
            <Marker
              position={[latitude, longitude]}
              draggable={true}
              eventHandlers={markerEvents}
              ref={markerRef}
              icon={patientIcon}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
