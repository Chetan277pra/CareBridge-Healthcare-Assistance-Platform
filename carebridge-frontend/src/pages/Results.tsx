import { useState, useEffect } from "react";
import { BookingModal } from "@/components/BookingModal";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

// Custom SVG icon generator for leaflet markers
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

const patientIcon = createSVGIcon("#3b82f6");   // Blue
const therapistIcon = createSVGIcon("#22c55e"); // Green
const hospitalIcon = createSVGIcon("#a855f7");  // Purple

// Helper component to auto-fit map view to contain all loaded markers
const FitMapBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};

interface RouteMapProps {
  patientCoords: [number, number];
  therapistCoords?: [number, number] | null;
  hospitalCoords?: [number, number] | null;
  therapistName?: string;
  hospitalName?: string;
  patientName?: string;
  height?: string;
}

const RouteMap = ({
  patientCoords,
  therapistCoords,
  hospitalCoords,
  therapistName = "Specialist",
  hospitalName = "Hospital",
  patientName = "You",
  height = "320px",
}: RouteMapProps) => {
  const points: [number, number][] = [patientCoords];
  if (hospitalCoords) points.push(hospitalCoords);
  if (therapistCoords) points.push(therapistCoords);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 z-0 relative" style={{ height }}>
      <MapContainer
        center={patientCoords}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMapBounds points={points} />
        
        {/* Patient Marker */}
        <Marker position={patientCoords} icon={patientIcon}>
          <Popup>
            <div className="text-slate-800 font-semibold">{patientName} (Your Location)</div>
          </Popup>
        </Marker>

        {/* Hospital Marker */}
        {hospitalCoords && (
          <Marker position={hospitalCoords} icon={hospitalIcon}>
            <Popup>
              <div className="text-slate-800 font-semibold">{hospitalName}</div>
            </Popup>
          </Marker>
        )}

        {/* Therapist Marker */}
        {therapistCoords && (
          <Marker position={therapistCoords} icon={therapistIcon}>
            <Popup>
              <div className="text-slate-800 font-semibold">{therapistName}</div>
            </Popup>
          </Marker>
        )}

        {/* Polyline Path Route */}
        <Polyline positions={points} color="#6366f1" weight={4} opacity={0.8} dashArray="8, 8" />
      </MapContainer>
    </div>
  );
};

function Results() {
  const location = useLocation();
  const [result, setResult] = useState<any>(location.state as any);
  const [loading, setLoading] = useState<boolean>(!location.state);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  // Track which provider the patient is booking with
  const [bookingProviderType, setBookingProviderType] = useState<'THERAPIST' | 'HOSPITAL' | null>(null);
  const [bookingProviderId, setBookingProviderId] = useState<number | null>(null);
  const [bookingProviderName, setBookingProviderName] = useState<string>("");

  // Resolve therapist and hospital IDs dynamically
  const [resolvedTherapistId, setResolvedTherapistId] = useState<number | null>(null);
  const [resolvedHospitalId, setResolvedHospitalId] = useState<number | null>(null);
  const [resolvedTherapistCoords, setResolvedTherapistCoords] = useState<[number, number] | null>(null);
  const [resolvedHospitalCoords, setResolvedHospitalCoords] = useState<[number, number] | null>(null);
  const [resolvedHospitalAddress, setResolvedHospitalAddress] = useState<string>("");

  useEffect(() => {
    if (result) {
      setLoading(false);
      return;
    }

    const fetchLatestHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Fetch latest history record
        const historyRes = await axios.get("http://localhost:8080/api/history/my-latest", { headers });
        const historyData = historyRes.data;

        if (!historyData || !historyData.disease) {
          setLoading(false);
          return;
        }

        // 2. Fetch authenticated user profile to get patient coordinates
        const userRes = await axios.get("http://localhost:8080/api/auth/me", { headers });
        const userData = userRes.data;

        setResult({
          disease: historyData.disease,
          therapistName: historyData.therapistName,
          hospitalSuggestion: historyData.hospitalSuggestion,
          patientLatitude: userData.latitude,
          patientLongitude: userData.longitude,
          location: userData.location || "Your Location",
        });
      } catch (err) {
        console.error("Error loading latest assessment history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestHistory();
  }, [location.state]);

  useEffect(() => {
    if (!result) return;

    const resolveIds = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        if (result.therapistName) {
          const doctorRes = await axios.get("http://localhost:8080/api/therapist", { headers });
          const matchedDoctor = doctorRes.data.find(
            (doc: any) => doc.name.toLowerCase() === result.therapistName.toLowerCase()
          );
          if (matchedDoctor) {
            setResolvedTherapistId(matchedDoctor.id);
            if (matchedDoctor.latitude != null && matchedDoctor.longitude != null) {
              setResolvedTherapistCoords([matchedDoctor.latitude, matchedDoctor.longitude]);
            }
          }
        }

        if (result.hospitalSuggestion) {
          const hospitalRes = await axios.get("http://localhost:8080/api/hospital", { headers });
          const matchedHospital = hospitalRes.data.find(
            (hosp: any) => hosp.name.toLowerCase() === result.hospitalSuggestion.toLowerCase()
          );
          if (matchedHospital) {
            setResolvedHospitalId(matchedHospital.id);
            if (matchedHospital.latitude != null && matchedHospital.longitude != null) {
              setResolvedHospitalCoords([matchedHospital.latitude, matchedHospital.longitude]);
            }
            if (matchedHospital.location) {
              setResolvedHospitalAddress(matchedHospital.location);
            }
          }
        }
      } catch (err) {
        console.error("Error resolving provider IDs:", err);
      }
    };

    resolveIds();
  }, [result]);

  const hasPatientCoords =
    result &&
    result.patientLatitude != null &&
    result.patientLongitude != null;

  const therapistLatitude = result?.therapistLatitude ?? resolvedTherapistCoords?.[0] ?? null;
  const therapistLongitude = result?.therapistLongitude ?? resolvedTherapistCoords?.[1] ?? null;
  const hospitalLatitude = result?.hospitalLatitude ?? resolvedHospitalCoords?.[0] ?? null;
  const hospitalLongitude = result?.hospitalLongitude ?? resolvedHospitalCoords?.[1] ?? null;
  const hospitalAddress = result?.hospitalAddress || resolvedHospitalAddress || "";

  const hasTherapistCoords = therapistLatitude != null && therapistLongitude != null;
  const hasHospitalCoords = hospitalLatitude != null && hospitalLongitude != null;

  // Check route availability for both therapist and hospital
  const hasTherapistRoute = hasPatientCoords && hasTherapistCoords;

  const hasHospitalRoute = hasPatientCoords && hasHospitalCoords;

  // Calculate distances (using backend values where possible)
  const therapistDistanceKm = result?.therapistDistanceKm ?? (
    (hasPatientCoords && hasTherapistCoords)
      ? calculateDistanceKm(result.patientLatitude, result.patientLongitude, therapistLatitude, therapistLongitude)
      : null
  );
  const hospitalDistanceKm = result?.hospitalDistanceKm ?? (
    (hasPatientCoords && hasHospitalCoords)
      ? calculateDistanceKm(result.patientLatitude, result.patientLongitude, hospitalLatitude, hospitalLongitude)
      : null
  );

  const therapistHospitalDistanceKm = hasTherapistCoords && hasHospitalCoords
    ? calculateDistanceKm(
        therapistLatitude,
        therapistLongitude,
        hospitalLatitude,
        hospitalLongitude
      )
    : null;

  const hasCombinedRoute = hasTherapistRoute && hasHospitalRoute;

  const handleRequestAppointment = (providerType: 'THERAPIST' | 'HOSPITAL') => {
    setBookingProviderType(providerType);
    if (providerType === 'THERAPIST') {
      setBookingProviderId(resolvedTherapistId);
      setBookingProviderName(result?.therapistName ?? "");
    } else {
      setBookingProviderId(resolvedHospitalId);
      setBookingProviderName(result?.hospitalSuggestion ?? "");
    }
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async (bookingData: {
    appointmentDate: string;
    appointmentTime: string;
    reasonForVisit: string;
    notes: string;
    slotId: number | null;
  }) => {
    if (!result) return;
    const patientEmail = localStorage.getItem("userEmail");
    if (!patientEmail) {
      setRequestStatus("Unable to locate your account. Please log in again.");
      return;
    }

    setRequestLoading(true);
    setRequestStatus(null);

    try {
      await axios.post("http://localhost:8080/api/appointments/book", {
        patientEmail,
        disease: result.disease,
        message: bookingData.reasonForVisit,
        specialization: result.disease,
        therapistQuery: bookingProviderType === 'THERAPIST' ? result.therapistName : undefined,
        hospitalQuery: bookingProviderType === 'HOSPITAL' ? result.hospitalSuggestion : undefined,
        therapistId: bookingProviderType === 'THERAPIST' ? bookingProviderId : undefined,
        hospitalId: bookingProviderType === 'HOSPITAL' ? bookingProviderId : undefined,
        appointmentDate: bookingData.appointmentDate,
        appointmentTime: bookingData.appointmentTime,
        reasonForVisit: bookingData.reasonForVisit,
        notes: bookingData.notes,
        slotId: bookingData.slotId,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      setRequestStatus("Appointment request submitted successfully. Check your appointments page for status updates.");
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || "Unable to submit appointment request. Please try again later.";
      setRequestStatus(`Unable to submit appointment request: ${message}`);
      throw error; // Re-throw so BookingModal can display the error inline
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-indigo-900 font-semibold text-center px-4">Loading latest assessment results...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.98-5.5-2.5m.5-4C6.99 8.98 8.94 8 12 8s5.01.98 6.5 2.5M12 4v4m0 8v4" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">No Results Found</CardTitle>
            <CardDescription className="text-gray-600">Please complete a health assessment first to see your results.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/assessment">
              <Button className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg transition-all duration-300">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Start Assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        .animate-fade-in {
          animation: fadeInUp 0.8s ease-out;
        }
        .animate-pulse-gentle {
          animation: pulse 2s ease-in-out infinite;
        }
        .result-card {
          transition: all 0.3s ease;
        }
        .result-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      <div className="w-full mx-auto max-w-none px-4 md:px-8">
        {/* Success Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse-gentle">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Assessment Complete!
          </h1>
          <p className="text-xl text-gray-600">Here are your personalized health insights</p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Main Diagnosis Card */}
          <div className="lg:col-span-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Card className="result-card shadow-xl border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Predicted Condition</CardTitle>
                    <CardDescription className="text-blue-100">Based on your symptoms analysis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{result.disease}</div>
                <p className="text-blue-100">Our AI has analyzed your symptoms and provided this assessment. Please consult with a healthcare professional for accurate diagnosis.</p>
              </CardContent>
            </Card>
          </div>

          {/* Therapist Recommendation */}
          <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Card className="result-card shadow-xl border-0 bg-gradient-to-br from-green-400 to-emerald-600 text-white h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-xl">Recommended Specialist</CardTitle>
                    <CardDescription className="text-green-100">Expert care for your condition</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold mb-2">{result.therapistName}</div>
                <p className="text-green-100 text-sm">This specialist has expertise in treating {result.disease.toLowerCase()} and similar conditions.</p>
                {therapistDistanceKm != null && (
                  <p className="text-green-50 text-sm mt-2 font-medium">Distance: {therapistDistanceKm.toFixed(1)} km away</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hospital Recommendation */}
          <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Card className="result-card shadow-xl border-0 bg-gradient-to-br from-purple-500 to-pink-600 text-white h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-xl">Recommended Hospital</CardTitle>
                    <CardDescription className="text-purple-100">Quality healthcare facility</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold mb-2">{result.hospitalSuggestion}</div>
                <p className="text-purple-100 text-sm">This facility specializes in {result.disease.toLowerCase()} treatment and has excellent patient care ratings.</p>
                {hospitalDistanceKm != null && (
                  <p className="text-purple-50 text-sm mt-2 font-medium">Distance: {hospitalDistanceKm.toFixed(1)} km away</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Routes Section */}
          {(hasTherapistRoute || hasHospitalRoute) && (
            <div className="animate-fade-in lg:col-span-3" style={{ animationDelay: '0.7s' }}>
              <Card className="result-card shadow-xl border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5-5 5-5m0 0l6 6-6 6M4 15h16" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {hasTherapistRoute && hasHospitalRoute
                          ? "Healthcare Routes"
                          : hasTherapistRoute
                            ? "Specialist Route"
                            : "Hospital Route"}
                      </CardTitle>
                      <CardDescription className="text-slate-200">
                        {hasTherapistRoute && hasHospitalRoute
                          ? "Routes to both your specialist and hospital"
                          : "Route to your recommended healthcare provider"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(therapistDistanceKm != null || hospitalDistanceKm != null || therapistHospitalDistanceKm != null) && (
                    <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Distance Summary</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {therapistDistanceKm != null && (
                          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-3">
                            <p className="text-xs text-green-200">You ↔ Specialist</p>
                            <p className="text-base font-semibold text-white">{therapistDistanceKm.toFixed(1)} km</p>
                          </div>
                        )}
                        {hospitalDistanceKm != null && (
                          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3">
                            <p className="text-xs text-purple-200">You ↔ Hospital</p>
                            <p className="text-base font-semibold text-white">{hospitalDistanceKm.toFixed(1)} km</p>
                          </div>
                        )}
                        {therapistHospitalDistanceKm != null && (
                          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                            <p className="text-xs text-cyan-200">Specialist ↔ Hospital</p>
                            <p className="text-base font-semibold text-white">{therapistHospitalDistanceKm.toFixed(1)} km</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location Info Grid */}
                  <div className="grid gap-4 lg:grid-cols-3 mb-6">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Your Location</p>
                      <p className="mt-2 text-lg font-semibold text-white">{result.location || "Current position"}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Lat {result.patientLatitude?.toFixed(5)}, Lng {result.patientLongitude?.toFixed(5)}
                      </p>
                    </div>

                    {hasTherapistRoute && (
                      <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4">
                        <p className="text-sm uppercase tracking-[0.2em] text-green-300">Specialist Location</p>
                        <p className="mt-2 text-lg font-semibold text-white">{result.therapistName}</p>
                        <p className="mt-1 text-sm text-green-200">
                          {therapistDistanceKm != null && `Distance: ${therapistDistanceKm.toFixed(1)} km away`}
                        </p>
                      </div>
                    )}

                    {hasHospitalRoute && (
                      <div className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-4">
                        <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Hospital Location</p>
                        <p className="mt-2 text-lg font-semibold text-white">{result.hospitalSuggestion}</p>
                        <p className="mt-1 text-sm text-purple-200">
                          {hospitalAddress || "Hospital coordinates available"}
                          {hospitalDistanceKm != null && <br />}
                          {hospitalDistanceKm != null && `Distance: ${hospitalDistanceKm.toFixed(1)} km away`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Map Display */}
                  <div className="space-y-4">
                    {/* Combined Route (Both Therapist and Hospital) */}
                    {hasCombinedRoute && (
                      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
                        <div className="bg-gradient-to-r from-green-500/20 to-purple-500/20 p-3 border-b border-white/10">
                          <p className="text-sm font-semibold text-white">Combined Route: Patient → Hospital → Specialist</p>
                        </div>
                        <RouteMap
                          patientCoords={[result.patientLatitude, result.patientLongitude]}
                          therapistCoords={[therapistLatitude, therapistLongitude]}
                          hospitalCoords={[hospitalLatitude, hospitalLongitude]}
                          therapistName={result.therapistName}
                          hospitalName={result.hospitalSuggestion}
                          patientName={result.location || "You"}
                          height="320px"
                        />
                      </div>
                    )}

                    {/* Individual Routes (if not showing combined) */}
                    {!hasCombinedRoute && (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {hasTherapistRoute && (
                          <div className="overflow-hidden rounded-3xl border border-green-500/30 bg-green-500/5">
                            <div className="bg-gradient-to-r from-green-500/20 p-3 border-b border-green-500/20">
                              <p className="text-sm font-semibold text-green-200">Route to Specialist</p>
                            </div>
                            <RouteMap
                              patientCoords={[result.patientLatitude, result.patientLongitude]}
                              therapistCoords={[therapistLatitude, therapistLongitude]}
                              therapistName={result.therapistName}
                              patientName={result.location || "You"}
                              height="256px"
                            />
                          </div>
                        )}

                        {hasHospitalRoute && (
                          <div className="overflow-hidden rounded-3xl border border-purple-500/30 bg-purple-500/5">
                            <div className="bg-gradient-to-r from-purple-500/20 p-3 border-b border-purple-500/20">
                              <p className="text-sm font-semibold text-purple-200">Route to Hospital</p>
                            </div>
                            <RouteMap
                              patientCoords={[result.patientLatitude, result.patientLongitude]}
                              hospitalCoords={[hospitalLatitude, hospitalLongitude]}
                              hospitalName={result.hospitalSuggestion}
                              patientName={result.location || "You"}
                              height="256px"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Route Available */}
                    {!hasTherapistRoute && !hasHospitalRoute && (
                      <div className="p-8 text-center text-sm text-slate-300 bg-slate-800/50 rounded-3xl">
                        No route coordinates available to display maps.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Next Steps */}
          <div className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <Card className="result-card shadow-xl border-0 bg-gradient-to-br from-orange-400 to-red-500 text-white h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-xl">Next Steps</CardTitle>
                    <CardDescription className="text-orange-100">What to do now</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Contact recommended specialist
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Schedule appointment at hospital
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Follow up with healthcare provider
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-4 animate-fade-in md:flex-row" style={{ animationDelay: '1s' }}>
          <Link to="/dashboard" className="flex-1">
            <Button className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg transition-all duration-300">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              Back to Dashboard
            </Button>
          </Link>
          <Link to="/assessment" className="flex-1">
            <Button variant="outline" className="w-full h-14 text-lg font-semibold border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50 rounded-xl transition-all duration-300">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              New Assessment
            </Button>
          </Link>
          {localStorage.getItem("userRole") === "PATIENT" && (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {result.therapistName && (
                <Button
                  onClick={() => handleRequestAppointment('THERAPIST')}
                  disabled={requestLoading}
                  className="flex-1 h-14 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-300"
                >
                  📋 Book with Dr. {result.therapistName}
                </Button>
              )}
              {result.hospitalSuggestion && (
                <Button
                  onClick={() => handleRequestAppointment('HOSPITAL')}
                  disabled={requestLoading}
                  className="flex-1 h-14 text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg transition-all duration-300"
                >
                  🏥 Book at {result.hospitalSuggestion}
                </Button>
              )}
            </div>
          )}
        </div>
        {requestStatus && (
          <div className="mt-4 rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            {requestStatus}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '1.2s' }}>
          <p className="text-sm text-gray-500 bg-white/50 rounded-lg p-4 backdrop-blur-sm">
            <strong>Important:</strong> This assessment is for informational purposes only and should not replace professional medical advice.
            Please consult with qualified healthcare providers for accurate diagnosis and treatment.
          </p>
        </div>
      </div>
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSubmit={handleConfirmBooking}
        providerName={bookingProviderName || `${result.therapistName} & ${result.hospitalSuggestion}`}
        providerId={bookingProviderId}
        providerType={bookingProviderType}
      />
    </div>
  );
}

export default Results;