import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppointmentSocket } from "@/hooks/useAppointmentSocket";
import { useCountdown } from "@/hooks/useCountdown";

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
  approvedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  updatedAt?: string;
}



const hospitalLocationMap: Record<
  string,
  { name: string; address: string }
> = {
  "central@hospital.com": {
    name: "Central Health Hospital",
    address: "200 Broadway, New York, NY",
  },
  "city@hospital.com": {
    name: "City Medical Center",
    address: "900 7th Ave, New York, NY",
  },
  "sunrise@hospital.com": {
    name: "Sunrise Medical Complex",
    address: "350 5th Ave, New York, NY",
  },
  "premier@hospital.com": {
    name: "Premier Health Institute",
    address: "120 W 57th St, New York, NY",
  },
  "community@hospital.com": {
    name: "Community Care Hospital",
    address: "500 6th Ave, New York, NY",
  },
};

const getHospitalDetails = (email?: string) => {
  if (!email) {
    return { name: "City Medical Center", address: "900 7th Ave, New York, NY" };
  }
  return hospitalLocationMap[email] || { name: email, address: "General Hospital Address" };
};

const formatTimestamp = (isoString?: string) => {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

export default function AppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole"); // PATIENT, THERAPIST, HOSPITAL


  // Live WebSocket status updates
  useAppointmentSocket({
    onEvent: (event) => {
      if (event.appointmentId === Number(id)) {
        setApt(prev => prev ? { ...prev, status: event.status } : prev);
      }
    },
  });

  // Countdown timer for accepted upcoming appointments
  const aptDateTime = apt?.appointmentDate && apt?.appointmentTime
    ? `${apt.appointmentDate}T${apt.appointmentTime}`
    : null;
  const countdown = useCountdown(aptDateTime);

  useEffect(() => {
    if (!token || !id) {
      navigate("/");
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/appointments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setApt(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load appointment details. You might not have permission to view it.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, token, navigate]);

  const handleAction = async (endpoint: string) => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      await axios.put(
        `${API_BASE}/api/appointments/${id}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Reload appointment details
      const detailRes = await axios.get(`${API_BASE}/api/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApt(detailRes.data);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to perform action.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoBack = () => {
    if (userRole === "PATIENT") {
      navigate("/appointments");
    } else if (userRole === "THERAPIST") {
      navigate("/therapist-dashboard");
    } else if (userRole === "HOSPITAL") {
      navigate("/hospital-dashboard");
    } else {
      navigate("/dashboard");
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading details...</div>
      </div>
    );
  }

  if (error || !apt) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border border-slate-800 text-center text-slate-100 p-6 rounded-3xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied / Not Found</h2>
          <p className="text-slate-300 mb-6">{error || "Unable to locate appointment."}</p>
          <Button onClick={handleGoBack} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const hospital = getHospitalDetails(apt.hospitalEmail);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Navigation / Header */}
        <div className="flex justify-between items-center py-4 border-b border-slate-800">
          <div>
            <button onClick={handleGoBack} className="text-sm font-semibold text-cyan-400 hover:underline">
              ← Back to Appointments
            </button>
            <h1 className="text-3xl font-bold text-white mt-2">Appointment Details</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusBadge(apt.status)}`}>
              {apt.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Countdown Banner for Accepted Upcoming Appointments */}
        {apt.status.toUpperCase() === "ACCEPTED" && aptDateTime && !countdown.isPast && (
          <div className={`rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4 ${
            countdown.isNow
              ? "bg-gradient-to-r from-red-900/60 to-rose-900/60 border border-red-500/40"
              : "bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/40"
          }`}>
            <div>
              <div className="text-xs uppercase tracking-widest text-indigo-300 mb-1">⏱ Appointment Countdown</div>
              <div className="text-sm text-slate-300">
                {apt.appointmentDate} at {apt.appointmentTime}
              </div>
            </div>
            <div className="text-right">
              {countdown.isNow ? (
                <span className="text-red-300 text-xl font-bold animate-pulse">🔴 Starting Right Now!</span>
              ) : (
                <>
                  <div className="text-4xl font-bold font-mono text-white tracking-wider">{countdown.formatted}</div>
                  <div className="text-xs text-slate-400">remaining until appointment</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Visual Status Timeline */}
        <Card className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-5">📍 Appointment Progress</h2>
          {(() => {
            const status = apt.status.toUpperCase();
            const steps = [
              { key: "REQUESTED",  label: "Requested",  icon: "📋", done: true },
              { key: "PENDING",    label: "Pending",    icon: "⏳", done: ["PENDING","ACCEPTED","REJECTED","COMPLETED","CANCELLED"].includes(status) },
              { key: "ACCEPTED",   label: "Accepted",   icon: "✅", done: status === "ACCEPTED" || status === "COMPLETED" },
              { key: "COMPLETED",  label: "Completed",  icon: "🎉", done: status === "COMPLETED" },
            ];
            if (status === "REJECTED") steps[2] = { key: "REJECTED", label: "Rejected", icon: "❌", done: true };
            if (status === "CANCELLED") steps[2] = { key: "CANCELLED", label: "Cancelled", icon: "🚫", done: true };
            return (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                {steps.map((step, idx) => (
                  <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                      {idx > 0 && <div style={{ flex: 1, height: 3, background: steps[idx].done ? "#6366f1" : "#334155", transition: "background 0.4s" }} />}
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: step.done ? "linear-gradient(135deg,#6366f1,#a78bfa)" : "#1e293b",
                        border: step.done ? "2px solid #818cf8" : "2px solid #334155",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, flexShrink: 0, transition: "all 0.4s",
                        boxShadow: step.done ? "0 0 16px rgba(99,102,241,0.4)" : "none",
                      }}>{step.icon}</div>
                      {idx < steps.length - 1 && <div style={{ flex: 1, height: 3, background: steps[idx + 1]?.done ? "#6366f1" : "#334155", transition: "background 0.4s" }} />}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: step.done ? "#a5b4fc" : "#475569", textAlign: "center" }}>{step.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 mb-4">
                📋 Consultation Information
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Disease predicted</p>
                  <p className="text-lg font-bold text-white mt-1">{apt.disease}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Specialization</p>
                  <p className="text-lg font-bold text-indigo-400 mt-1">{apt.specialization || "General Medicine"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Reason for Visit</p>
                  <p className="text-sm text-slate-200 mt-1.5 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    {apt.reasonForVisit || "No reason specified"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Patient's Notes</p>
                  <p className="text-sm text-slate-300 mt-1.5 bg-slate-800/40 p-3 rounded-xl border border-slate-800 italic">
                    {apt.notes ? `"${apt.notes}"` : "No notes attached"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 mb-4">
                👥 Contact Details
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Patient</p>
                  <p className="text-sm font-bold text-white mt-1">{apt.patientName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{apt.patientEmail}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{apt.patientPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Hospital</p>
                  <p className="text-sm font-bold text-white mt-1">{hospital.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{apt.hospitalEmail}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{hospital.address}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Specialist Doctor</p>
                  <p className="text-sm font-bold text-white mt-1">{apt.therapistEmail ? "Assigned Therapist" : "Unassigned"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{apt.therapistEmail || "None"}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar: Timeline, Timestamps, Actions */}
          <div className="space-y-6">
            <Card className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 mb-4">
                📅 Schedule
              </h2>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
                <p className="text-base font-bold text-white mt-1">
                  {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  }) : "Not Scheduled"}
                </p>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Time</p>
                <p className="text-base font-bold text-white mt-1">
                  {apt.appointmentTime ? apt.appointmentTime.slice(0, 5) : "Not Scheduled"}
                </p>
              </div>
            </Card>

            <Card className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 mb-4">
                ⏳ Lifecycle Timeline
              </h2>
              <div className="space-y-4 relative pl-4 border-l border-slate-800 text-xs">
                {apt.requestedAt && (
                  <div>
                    <span className="absolute -left-[4.5px] w-2 h-2 rounded-full bg-yellow-500"></span>
                    <p className="font-semibold text-slate-400">Requested At</p>
                    <p className="text-slate-300 mt-0.5">{formatTimestamp(apt.requestedAt)}</p>
                  </div>
                )}
                {apt.approvedAt && (
                  <div>
                    <span className="absolute -left-[4.5px] w-2 h-2 rounded-full bg-emerald-500"></span>
                    <p className="font-semibold text-slate-400">Accepted At</p>
                    <p className="text-slate-300 mt-0.5">{formatTimestamp(apt.approvedAt)}</p>
                  </div>
                )}
                {apt.rejectedAt && (
                  <div>
                    <span className="absolute -left-[4.5px] w-2 h-2 rounded-full bg-rose-500"></span>
                    <p className="font-semibold text-slate-400">Rejected At</p>
                    <p className="text-slate-300 mt-0.5">{formatTimestamp(apt.rejectedAt)}</p>
                  </div>
                )}
                {apt.completedAt && (
                  <div>
                    <span className="absolute -left-[4.5px] w-2 h-2 rounded-full bg-blue-500"></span>
                    <p className="font-semibold text-slate-400">Completed At</p>
                    <p className="text-slate-300 mt-0.5">{formatTimestamp(apt.completedAt)}</p>
                  </div>
                )}
                {apt.cancelledAt && (
                  <div>
                    <span className="absolute -left-[4.5px] w-2 h-2 rounded-full bg-gray-500"></span>
                    <p className="font-semibold text-slate-400">Cancelled At</p>
                    <p className="text-slate-300 mt-0.5">{formatTimestamp(apt.cancelledAt)}</p>
                  </div>
                )}
                {apt.updatedAt && (
                  <div>
                    <span className="absolute -left-[4.5px] w-2 h-2 rounded-full bg-indigo-500"></span>
                    <p className="font-semibold text-slate-400">Last Updated</p>
                    <p className="text-slate-300 mt-0.5">{formatTimestamp(apt.updatedAt)}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Actions Block */}
            {actionLoading ? (
              <p className="text-slate-400 text-center py-2 text-sm font-semibold">Processing action...</p>
            ) : (
              <div className="space-y-3">
                {/* Patient Cancellation Actions */}
                {userRole === "PATIENT" && (apt.status === "PENDING" || apt.status === "ACCEPTED") && (
                  <Button
                    onClick={() => handleAction("cancel")}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold py-3 shadow-lg"
                  >
                    Cancel Appointment
                  </Button>
                )}

                {/* Therapist & Hospital Acceptance/Rejection Actions */}
                {(userRole === "THERAPIST" || userRole === "HOSPITAL") && apt.status === "PENDING" && (
                  <>
                    <Button
                      onClick={() => handleAction("accept")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold py-3 shadow-lg"
                    >
                      Accept Appointment
                    </Button>
                    <Button
                      onClick={() => handleAction("reject")}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold py-3 shadow-lg"
                    >
                      Reject Appointment
                    </Button>
                  </>
                )}

                {/* Therapist & Hospital Completion Actions */}
                {(userRole === "THERAPIST" || userRole === "HOSPITAL") && apt.status === "ACCEPTED" && (
                  <>
                    <Button
                      onClick={() => handleAction("complete")}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold py-3 shadow-lg"
                    >
                      Mark as Completed
                    </Button>
                    <Button
                      onClick={() => handleAction("reject")}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold py-3 shadow-lg"
                    >
                      Reject/Cancel Appointment
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
