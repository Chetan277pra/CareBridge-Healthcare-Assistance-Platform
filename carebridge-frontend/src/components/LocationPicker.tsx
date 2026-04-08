import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";

interface LocationPickerProps {
  apiKey: string;
  label: string;
  query: string;
  latitude: number | null;
  longitude: number | null;
  onQueryChange: (value: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

const LocationPicker = ({
  apiKey,
  label,
  query,
  latitude,
  longitude,
  onQueryChange,
  onCoordinatesChange,
  className = "",
}: LocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API key is not configured.");
      setLoading(false);
      return;
    }

    const initializeMap = () => {
      if (!mapRef.current || !window.google?.maps) {
        setError("Unable to initialize the map.");
        setLoading(false);
        return;
      }

      if (!window.google.maps.places) {
        setError("Google Places library failed to load.");
        setLoading(false);
        return;
      }

      const initialPosition = {
        lat: latitude ?? 20.5937,
        lng: longitude ?? 78.9629,
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: initialPosition,
        zoom: 6,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      markerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: initialPosition,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      if (latitude !== null && longitude !== null) {
        mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
        mapInstanceRef.current.setZoom(15);
      }

      mapInstanceRef.current.addListener("click", (event: any) => {
        setMarker(event.latLng.lat(), event.latLng.lng());
      });

      markerRef.current.addListener("dragend", (event: any) => {
        setMarker(event.latLng.lat(), event.latLng.lng());
      });

      // Initialize autocomplete
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
          types: ["geocode"],
          fields: ["formatted_address", "geometry", "name"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          if (place.geometry) {
            setMarker(place.geometry.location.lat(), place.geometry.location.lng());
            onQueryChange(place.formatted_address || place.name || query);
          } else {
            setError("Please select a valid address from the dropdown.");
          }
        });
      }

      if (latitude === null || longitude === null) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setMarker(position.coords.latitude, position.coords.longitude);
            },
            () => {
              setLoading(false);
            }
          );
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    const authFailure = () => {
      setError("Google Maps authentication failed. Check your API key and referrer restrictions.");
      setLoading(false);
    };

    window.gm_authFailure = authFailure;

    const loadGoogleMapsApi = () => {
      // Already fully loaded with places
      if (window.google?.maps?.places) {
        return Promise.resolve();
      }

      const existingPromise = (window as any).__googleMapsLoadingPromise;
      if (existingPromise) {
        return existingPromise;
      }

      const promise = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
        if (existingScript) {
          // Script tag exists but may still be loading
          if (window.google?.maps?.places) {
            resolve();
          } else {
            existingScript.addEventListener("load", () => resolve());
            existingScript.addEventListener("error", () => reject(new Error("Unable to load Google Maps. Check your API key.")));
          }
          return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unable to load Google Maps. Check your API key."));
        document.head.appendChild(script);
      });

      (window as any).__googleMapsLoadingPromise = promise;
      return promise;
    };

    loadGoogleMapsApi()
      .then(() => initializeMap())
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load Google Maps. Check your API key.");
        setLoading(false);
      });

    return () => {
      if (window.gm_authFailure === authFailure) {
        window.gm_authFailure = undefined;
      }
    };
  }, [apiKey]);

  const setMarker = (lat: number, lng: number) => {
    if (markerRef.current && window.google?.maps) {
      markerRef.current.setPosition({ lat, lng });
      markerRef.current.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => markerRef.current.setAnimation(null), 2000);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(15);
    }
    onCoordinatesChange(lat, lng);
    setLoading(false);

    // Reverse geocode to get address
    if (window.google?.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          onQueryChange(results[0].formatted_address);
        }
      });
    }
  };

  const fallbackGeocode = async (address: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results?.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        onQueryChange(result.formatted_address || address);
        setMarker(lat, lng);
        setError(null);
        return;
      }
    } catch (fetchError) {
      console.error(fetchError);
    }

    setError("Address not found. Try another search term.");
  };

  const handleSearch = async () => {
    if (!query) {
      setError("Enter a location and try again.");
      return;
    }

    setError(null);

    if (window.google?.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: query }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          setMarker(location.lat(), location.lng());
        } else {
          fallbackGeocode(query);
        }
      });
    } else if (apiKey) {
      await fallbackGeocode(query);
    } else {
      setError("Unable to search for location. Check your Google Maps API key.");
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">{label}</label>
          <span className="text-xs text-slate-500">Drag the pin or search address.</span>
        </div>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setError(null);
              onQueryChange(e.target.value);
            }}
            placeholder="Search address or landmark"
            className="flex-1 rounded-3xl border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-3xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Search
          </button>
        </div>
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
          <p className="mt-2 text-xs text-slate-600">
            If this persists, validate your Google Maps API key, enable billing, and make sure the key allows your local app origin.
          </p>
        </div>
      )}

      {!error && (
        <div className="overflow-hidden rounded-3xl border border-slate-300 bg-slate-100" style={{ minHeight: 500 }}>
          <div ref={mapRef} className="h-96 w-full" />
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-500 text-center">
          Loading interactive map...
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
