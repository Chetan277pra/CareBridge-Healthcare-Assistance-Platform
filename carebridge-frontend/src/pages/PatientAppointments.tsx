import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppointmentSocket } from "@/hooks/useAppointmentSocket";
import { useCountdown } from "@/hooks/useCountdown";
import { NotificationBell } from "@/components/NotificationBell";

interface Appointment {
  id: number | string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  disease: string;
  message?: string;
  status: string;
  specialization?: string;
  therapistEmail?: string;
  hospitalEmail?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentDateTime?: string;
  reasonForVisit?: string;
  notes?: string;
  therapistDistanceKm?: number;
  hospitalDistanceKm?: number;
  requestedAt?: string;
  updatedAt?: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

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

const formatTimestamp = (isoString?: string) => {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

const formatTime = (timeString?: string) => {
  if (!timeString) return "N/A";
  try {
    // Expects "HH:mm" or "HH:mm:ss"
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

/** Small inline countdown for appointment cards */
function AptCountdown({ dateTimeStr }: { dateTimeStr: string }) {
  const cd = useCountdown(dateTimeStr);
  if (cd.isPast) return null;
  return (
    <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
      cd.isNow
        ? "bg-red-500/20 text-red-300 border-red-500/30 animate-pulse"
        : "bg-indigo-500/15 text-indigo-300 border-indigo-500/25"
    }`}>
      <span>{cd.isNow ? "🔴" : "⏱"}</span>
      <span>{cd.isNow ? "Starting Now!" : `In ${cd.formatted}`}</span>
    </div>
  );
}

function PatientAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const fetchAppointments = async () => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail");
    if (!token || !userEmail) return;
    try {
      const response = await axios.get(
        `${API_BASE}/api/appointments/history?email=${userEmail}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointments(response.data || []);
    } catch {
      // ignore on refresh
    } finally {
      setLoading(false);
    }
  };

  // Live WebSocket updates
  const { lastEvent } = useAppointmentSocket({
    onEvent: (event) => {
      // Update status directly in local state for instant feedback
      setAppointments(prev => prev.map(apt =>
        apt.id === event.appointmentId
          ? { ...apt, status: event.status }
          : apt
      ));
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail");
    
    if (!token || !userEmail) {
      navigate("/");
      return;
    }
    fetchAppointments();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "PENDING":
        return "text-yellow-300 bg-yellow-500/10 border border-yellow-500/30";
      case "ACCEPTED":
        return "text-emerald-300 bg-emerald-500/10 border border-emerald-500/30";
      case "REJECTED":
        return "text-rose-300 bg-rose-500/10 border border-rose-500/30";
      case "COMPLETED":
        return "text-blue-300 bg-blue-500/10 border border-blue-500/30";
      case "CANCELLED":
        return "text-gray-400 bg-slate-800 border border-slate-700";
      case "RESCHEDULED":
        return "text-orange-300 bg-orange-500/10 border border-orange-500/30";
      default:
        return "text-slate-300 bg-slate-500/10 border border-slate-500/30";
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const aptStatus = (apt.status || "PENDING").toUpperCase();
    const matchesStatus = filter === "ALL" || aptStatus === filter;

    const hospital = getHospitalLocation(apt.hospitalEmail);
    const searchString = search.toLowerCase();
    const matchesSearch =
      apt.id?.toString().includes(searchString) ||
      (apt.disease && apt.disease.toLowerCase().includes(searchString)) ||
      (apt.specialization && apt.specialization.toLowerCase().includes(searchString)) ||
      (apt.therapistEmail && apt.therapistEmail.toLowerCase().includes(searchString)) ||
      (hospital.name && hospital.name.toLowerCase().includes(searchString)) ||
      (apt.reasonForVisit && apt.reasonForVisit.toLowerCase().includes(searchString));

    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 py-4 mb-8 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">CareBridge Dashboard</p>
            <h1 className="text-3xl font-bold text-white mt-1">Appointment History & Lifecycle</h1>
          </div>
          <div className="flex gap-3 items-center">
            <NotificationBell liveEvent={lastEvent} />
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2 rounded-2xl border border-slate-700"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 text-white font-medium px-6 py-2 rounded-2xl"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Search & Filter Card */}
        <Card className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
          <div className="grid gap-6 md:grid-cols-[1.5fr_1fr] items-end">
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-slate-300 mb-2">
                🔍 Search Appointments
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, hospital, specialist, disease or reason..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 w-full mb-1 font-semibold">Filter by Status</span>
              {["ALL", "PENDING", "ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED", "RESCHEDULED"].map(statusVal => (
                <button
                  key={statusVal}
                  onClick={() => setFilter(statusVal)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filter === statusVal
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {statusVal}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
              <p className="text-lg text-white font-semibold">No appointments found</p>
              <p className="mt-2 text-slate-400">Try adjusting your filters or search text, or book a new appointment.</p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="mt-6 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-8 py-2.5 rounded-2xl"
              >
                Book Appointment
              </Button>
            </div>
          ) : (
            filteredAppointments.map(apt => {
              const hospital = getHospitalLocation(apt.hospitalEmail);
              return (
                <Card key={apt.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition duration-300">
                  <CardContent className="p-6 md:p-8 space-y-6">
                    {/* Top Row: ID, Disease, Status */}
                    <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">ID: #{apt.id}</span>
                          <span className="text-xs text-slate-500">|</span>
                          <span className="text-xs text-slate-400">Requested: {formatTimestamp(apt.requestedAt)}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mt-1">{apt.disease}</h3>
                        <p className="text-xs text-indigo-400 font-semibold">{apt.specialization || "General Medicine"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1 rounded-full text-xs font-bold ${getStatusBadge(apt.status)}`}>
                          {apt.status.toUpperCase()}
                        </span>
                        <Link to={`/appointments/${apt.id}`}>
                          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-xl border border-indigo-500 shadow-md">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Middle Row: Patient, Doctor, Hospital Info */}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">Hospital Suggestion</p>
                        <p className="text-sm font-bold text-white mt-1">{hospital.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{apt.hospitalEmail}</p>
                        {apt.hospitalDistanceKm != null && (
                          <span className="inline-block mt-2 text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-md font-semibold">
                            📍 {apt.hospitalDistanceKm.toFixed(1)} km away
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">Recommended Specialist</p>
                        <p className="text-sm font-bold text-white mt-1">{apt.therapistEmail ? "Specialist Doctor" : "None Assigned"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{apt.therapistEmail}</p>
                        {apt.therapistDistanceKm != null && (
                          <span className="inline-block mt-2 text-xs bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded-md font-semibold">
                            📍 {apt.therapistDistanceKm.toFixed(1)} km away
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">Schedule Time</p>
                        <p className="text-sm font-bold text-white mt-1">📅 {formatDate(apt.appointmentDate)}</p>
                        <p className="text-sm text-slate-300 mt-0.5">⏰ {formatTime(apt.appointmentTime)}</p>
                        {/* Countdown for accepted upcoming appointments */}
                        {apt.status.toUpperCase() === "ACCEPTED" && apt.appointmentDate && apt.appointmentTime && (() => {
                          const dtStr = `${apt.appointmentDate}T${apt.appointmentTime}`;
                          // Inline countdown display using a small sub-component
                          return <AptCountdown dateTimeStr={dtStr} />;
                        })()}
                      </div>
                    </div>

                    {/* Bottom Row: Visit Reason, Notes, and Timestamps */}
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-800/60 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Reason for Visit</p>
                        <p className="text-sm text-slate-200 mt-1">{apt.reasonForVisit || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Notes</p>
                        <p className="text-sm text-slate-300 mt-1 italic">{apt.notes ? `"${apt.notes}"` : "None"}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                      <span>Last Updated: {formatTimestamp(apt.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientAppointments;
