import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: string;
  patientName?: string;
  patientEmail?: string;
  therapistName?: string;
  therapistEmail?: string;
  hospitalEmail?: string;
  disease: string;
  date: string;
  status: "pending" | "accepted" | "rejected";
  message?: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const patientLocation: LatLng = {
  lat: 40.73061,
  lng: -73.935242,
};

const hospitalLocationMap: Record<
  string,
  { coords: LatLng; name: string; address: string }
> = {
  "central@hospital.com": {
    coords: { lat: 40.712776, lng: -74.005974 },
    name: "Central Health Hospital",
    address: "200 Broadway, New York, NY",
  },
  "city@hospital.com": {
    coords: { lat: 40.758896, lng: -73.98513 },
    name: "City Medical Center",
    address: "900 7th Ave, New York, NY",
  },
  "sunrise@hospital.com": {
    coords: { lat: 40.748817, lng: -73.985428 },
    name: "Sunrise Medical Complex",
    address: "350 5th Ave, New York, NY",
  },
  "premier@hospital.com": {
    coords: { lat: 40.761432, lng: -73.977622 },
    name: "Premier Health Institute",
    address: "120 W 57th St, New York, NY",
  },
  "community@hospital.com": {
    coords: { lat: 40.746157, lng: -73.982253 },
    name: "Community Care Hospital",
    address: "500 6th Ave, New York, NY",
  },
};

const diseaseImageMap: Record<string, string> = {
  diabetes:
    "https://images.unsplash.com/photo-1576765607924-1f117ede6826?auto=format&fit=crop&w=1200&q=80",
  hypertension:
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80",
  migraine:
    "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?auto=format&fit=crop&w=1200&q=80",
  asthma:
    "https://images.unsplash.com/photo-1582130665638-2dd8343fd655?auto=format&fit=crop&w=1200&q=80",
  depression:
    "https://images.unsplash.com/photo-1520221234888-9d8775d32d30?auto=format&fit=crop&w=1200&q=80",
  "general consultation":
    "https://images.unsplash.com/photo-1580281657521-0fabc3c9b47d?auto=format&fit=crop&w=1200&q=80",
  default:
    "https://images.unsplash.com/photo-1580281657521-0fabc3c9b47d?auto=format&fit=crop&w=1200&q=80",
};

const getHospitalLocation = (
  email?: string
): { coords: LatLng; name: string; address: string } => {
  if (!email) {
    return {
      coords: { lat: 40.758896, lng: -73.98513 },
      name: "City Medical Center",
      address: "900 7th Ave, New York, NY",
    };
  }

  return (
    hospitalLocationMap[email] || {
      coords: { lat: 40.758896, lng: -73.98513 },
      name: email,
      address: "Unknown Hospital Location",
    }
  );
};

const getDiseaseImage = (disease: string) => {
  const key = disease.trim().toLowerCase();
  return diseaseImageMap[key] || diseaseImageMap.default;
};

const calculateDistanceKm = (origin: LatLng, destination: LatLng) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) *
      Math.cos(toRad(destination.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

function PatientAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail");
    
    if (!token || !userEmail) {
      navigate("/");
      return;
    }

    const fetchAppointments = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8080/api/appointments/patient?email=${userEmail}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAppointments(response.data || []);
      } catch (error) {
        console.log("Using mock appointments");
        // Mock data fallback
        setAppointments([
          {
            id: "apt1",
            therapistName: "Dr. Sarah Johnson",
            therapistEmail: "sarah@example.com",
            disease: "Diabetes",
            date: new Date(Date.now() + 86400000).toISOString(),
            status: "pending",
            message: "Waiting for doctor to accept your request",
          },
          {
            id: "apt2",
            therapistName: "Dr. Michael Chen",
            therapistEmail: "michael@example.com",
            disease: "Hypertension",
            date: new Date(Date.now() + 172800000).toISOString(),
            status: "accepted",
            message: "Doctor has accepted your appointment",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const appointmentCards = useMemo(
    () =>
      appointments.map((apt) => {
        const hospital = getHospitalLocation(apt.hospitalEmail);
        const distanceKm = calculateDistanceKm(patientLocation, hospital.coords);
        const mapSrc = GOOGLE_MAPS_API_KEY
          ? `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(
              `${patientLocation.lat},${patientLocation.lng}`
            )}&destination=${encodeURIComponent(`${hospital.coords.lat},${hospital.coords.lng}`)}&mode=driving`
          : null;

        return (
          <div
            key={apt.id}
            className={`rounded-3xl border border-slate-700/70 bg-slate-950/70 shadow-2xl shadow-black/20 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
              apt.status === "accepted"
                ? "ring-2 ring-emerald-500/40"
                : apt.status === "rejected"
                ? "ring-2 ring-rose-500/40"
                : "ring-2 ring-yellow-400/30"
            }`}
          >
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Appointment</p>
                    <h3 className="text-3xl font-semibold text-white">{apt.disease}</h3>
                    <p className="mt-2 text-slate-400">{hospital.name}</p>
                  </div>
                  <div className="rounded-3xl bg-gradient-to-br from-cyan-500/30 to-blue-500/15 px-4 py-3 text-right">
                    <p className="text-xs text-slate-300">Distance</p>
                    <p className="text-2xl font-bold text-white">{distanceKm.toFixed(1)} km</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Patient location</p>
                    <p className="mt-2 text-white">Your current location</p>
                    <p className="mt-1 text-sm text-slate-400">Lat {patientLocation.lat.toFixed(4)}, Lng {patientLocation.lng.toFixed(4)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hospital location</p>
                    <p className="mt-2 text-white">{hospital.address}</p>
                    <p className="mt-1 text-sm text-slate-400">Lat {hospital.coords.lat.toFixed(4)}, Lng {hospital.coords.lng.toFixed(4)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/80">
                  <img
                    src={getDiseaseImage(apt.disease)}
                    alt={apt.disease}
                    className="h-56 w-full object-cover transition duration-500 hover:scale-105"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4">
                    <p className="text-sm text-slate-400">Provider</p>
                    <p className="text-white font-semibold">{apt.therapistName || "CareBridge Specialist"}</p>
                    <p className="text-sm text-slate-400">{apt.therapistEmail || apt.hospitalEmail}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4">
                    <p className="text-sm text-slate-400">Status</p>
                    <p
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                        apt.status === "accepted"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : apt.status === "rejected"
                          ? "bg-rose-500/15 text-rose-300"
                          : "bg-yellow-500/15 text-yellow-300"
                      }`}
                    >
                      {apt.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Route preview</p>
                  <div className="mt-4 h-72 overflow-hidden rounded-3xl bg-slate-950">
                    {mapSrc ? (
                      <iframe
                        title={`route-${apt.id}`}
                        src={mapSrc}
                        className="h-full w-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-slate-300">
                        <p className="text-lg font-semibold">Google Maps API key is missing.</p>
                        <p className="text-sm text-slate-400">
                          Add `VITE_GOOGLE_MAPS_API_KEY` to your frontend `.env` to show live route directions.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Quick notes</p>
                  <ul className="mt-3 space-y-2 text-slate-300">
                    <li>• Live route uses Google Maps directions embed.</li>
                    <li>• Distance is calculated with a geo formula for fast previews.</li>
                    <li>• Disease image updates based on your appointment condition.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      }),
    [appointments]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <div className="sticky top-0 z-50 border-b border-slate-700/60 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">CareBridge Navigator</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Your appointments with live route preview</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-2 rounded-2xl"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-6 py-2 rounded-2xl"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
        <div className="mb-10 rounded-4xl border border-slate-700/70 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/20">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div>
              <h2 className="text-3xl font-semibold text-white">Smart appointments with maps</h2>
              <p className="mt-4 max-w-2xl text-slate-400">
                See the estimated travel distance to your hospital, visualize the route, and explore dynamic disease insights in a beautifully redesigned appointments page.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Need a Google Maps API key?</p>
              <p className="mt-3 text-slate-300">
                Create a free Google Cloud project, enable Maps Embed API, and paste your API key into <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-cyan-200">VITE_GOOGLE_MAPS_API_KEY</code> in the frontend `.env` file.
              </p>
              <p className="mt-4 text-sm text-slate-400">The free Google Maps credit is usually enough for development and low-volume testing.</p>
            </div>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-4xl border border-slate-700/70 bg-slate-900/80 p-12 text-center text-slate-300">
            <p className="text-xl text-white">No appointments yet.</p>
            <p className="mt-3 text-slate-400">Book an appointment from the dashboard to see route previews and disease visuals.</p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-8 py-3 rounded-2xl"
            >
              Browse Hospitals
            </Button>
          </div>
        ) : (
          <div className="space-y-6">{appointmentCards}</div>
        )}
      </main>
    </div>
  );
}

export default PatientAppointments;
