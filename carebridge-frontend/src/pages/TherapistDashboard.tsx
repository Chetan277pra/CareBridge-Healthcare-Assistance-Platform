import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAppointmentSocket } from "@/hooks/useAppointmentSocket";
import { NotificationBell } from "@/components/NotificationBell";

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  disease: string;
  date: string;
  status: string;
  message?: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  specializations?: string[];
  rating: number;
  totalPatients: number;
}

function TherapistDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"dashboard" | "profile" | "patients" | "appointments" | "availability">("dashboard");
  // --- Availability State ---
  const [availDate, setAvailDate] = useState(new Date().toISOString().split("T")[0]);
  const [availSlots, setAvailSlots] = useState<any[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveList, setLeaveList] = useState<any[]>([]);
  const [availMsg, setAvailMsg] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Profile | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [specSearch, setSpecSearch] = useState("");

  // Analytics stats
  const [stats, setStats] = useState<any>(null);

  // Live WebSocket - refresh stats when appointment status changes
  const { lastEvent } = useAppointmentSocket({
    onEvent: () => { fetchStats(); fetchData(); },
  });
  const diseases = [
    "Fungal infection", "Allergy", "GERD", "Chronic cholestasis", "Drug Reaction", 
    "Peptic ulcer diseae", "AIDS", "Diabetes ", "Gastroenteritis", "Bronchial Asthma", 
    "Hypertension ", "Migraine", "Cervical spondylosis", "Paralysis (brain hemorrhage)", "Jaundice", 
    "Malaria", "Chicken pox", "Dengue", "Typhoid", "hepatitis A", 
    "Hepatitis B", "Hepatitis C", "Hepatitis D", "Hepatitis E", "Alcoholic hepatitis", 
    "Tuberculosis", "Common Cold", "Pneumonia", "Dimorphic hemmorhoids(piles)", "Heart attack", 
    "Varicose veins", "Hypothyroidism", "Hyperthyroidism", "Hypoglycemia", "Osteoarthristis", 
    "Arthritis", "(vertigo) Paroymsal  Positional Vertigo", "Acne", "Urinary tract infection", "Psoriasis", "Impetigo"
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    fetchData();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/dashboard/therapist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch { /* ignore */ }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("userEmail");

      // Fetch therapist profile
      const profileRes = await axios.get(
        `${API_BASE}/api/therapist/profile?email=${email}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(profileRes.data);

      // Fetch appointments
      const appointmentsRes = await axios.get(
        `${API_BASE}/api/appointments/therapist?email=${email}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointments((appointmentsRes.data || []).map((apt: any) => ({
        ...apt,
        status: (apt.status || "PENDING").toUpperCase()
      })));
    } catch (err) {
      console.log("Using mock data");
      // Mock data fallback
      setProfile({
        id: "t1",
        name: "Dr. Sarah Johnson",
        email: localStorage.getItem("userEmail") || "doctor@carebridge.com",
        phone: "+1-555-0101",
        specializations: ["Cardiology"],
        rating: 4.8,
        totalPatients: 24,
      });
      setAppointments([
        {
          id: "a1",
          patientName: "John Doe",
          patientEmail: "john@email.com",
          disease: "Hypertension",
          date: new Date(Date.now() + 3600000).toISOString(),
          status: "PENDING",
          message: "Looking for consultation on blood pressure management",
        },
        {
          id: "a2",
          patientName: "Jane Smith",
          patientEmail: "jane@email.com",
          disease: "Migraine",
          date: new Date(Date.now() + 7200000).toISOString(),
          status: "PENDING",
          message: "Seeking preventive treatment options",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // If profile is null after fetch, use mock
  useEffect(() => {
    if (!loading && !profile) {
      setProfile({
        id: "t1",
        name: "Dr. Sarah Johnson",
        email: localStorage.getItem("userEmail") || "doctor@carebridge.com",
        phone: "+1-555-0101",
        specialization: "Cardiology",
        rating: 4.8,
        totalPatients: 24,
      });
    }
  }, [loading, profile]);

  const handleAcceptAppointment = async (appointmentId: string) => {
    try {
      await axios.put(
        `${API_BASE}/api/appointments/${appointmentId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "ACCEPTED" } : a)
      );
    } catch (err) {
      // Mock accept
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "ACCEPTED" } : a)
      );
    }
  };

  const handleRejectAppointment = async (appointmentId: string) => {
    try {
      await axios.put(
        `${API_BASE}/api/appointments/${appointmentId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "REJECTED" } : a)
      );
    } catch (err) {
      // Mock reject
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "REJECTED" } : a)
      );
    }
  };

  // --- Availability Handlers ---
  const fetchProviderSlots = async (date: string) => {
    if (!profile) return;
    setAvailLoading(true);
    setAvailSlots([]);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/api/availability/provider/slots?date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailSlots(res.data || []);
    } catch (err) {
      setAvailSlots([]);
    } finally {
      setAvailLoading(false);
    }
  };

  const fetchLeaves = async () => {
    if (!profile?.id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/api/provider-leave/${profile.id}?type=THERAPIST`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeaveList(res.data || []);
    } catch (err) {
      setLeaveList([]);
    }
  };

  const handleToggleSlot = async (slotId: number, currentlyAvailable: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const action = currentlyAvailable ? "disable" : "enable";
      await axios.put(
        `${API_BASE}/api/availability/slots/${slotId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailSlots(prev => prev.map(s => s.id === slotId ? { ...s, available: !currentlyAvailable } : s));
      setAvailMsg(`Slot ${currentlyAvailable ? "disabled" : "enabled"} successfully.`);
      setTimeout(() => setAvailMsg(""), 3000);
    } catch (err: any) {
      setAvailMsg(err?.response?.data?.message || "Failed to toggle slot.");
      setTimeout(() => setAvailMsg(""), 3000);
    }
  };

  const handleMarkLeave = async () => {
    if (!leaveDate || !profile?.id) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/provider-leave`,
        { providerId: profile.id, providerType: "THERAPIST", leaveDate, reason: leaveReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeaveDate("");
      setLeaveReason("");
      setAvailMsg("Leave marked successfully.");
      fetchLeaves();
      fetchProviderSlots(availDate);
      setTimeout(() => setAvailMsg(""), 3000);
    } catch (err: any) {
      setAvailMsg(err?.response?.data?.message || "Failed to mark leave.");
      setTimeout(() => setAvailMsg(""), 3000);
    }
  };

  const handleRemoveLeave = async (leaveId: number) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE}/api/provider-leave/${leaveId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailMsg("Leave removed. Slots regenerated.");
      fetchLeaves();
      fetchProviderSlots(availDate);
      setTimeout(() => setAvailMsg(""), 3000);
    } catch (err: any) {
      setAvailMsg(err?.response?.data?.message || "Failed to remove leave.");
      setTimeout(() => setAvailMsg(""), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const handleEditProfileClick = () => {
    if (profile) {
      setEditForm({ ...profile });
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm) return;
    setEditLoading(true);
    try {
      const email = localStorage.getItem("userEmail");
      const response = await axios.put(
        `${API_BASE}/api/therapist/profile?email=${email}`,
        {
          name: editForm.name,
          phone: editForm.phone,
          specializations: editForm.specializations,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      console.log("Profile updated:", response.data);
      setProfile(editForm);
      setIsEditingProfile(false);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error("Failed to update profile", err);
      alert("Error updating profile: " + (err.response?.data?.message || err.message));
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditForm(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-blue-400/20">
        <div className="w-full px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
              {profile?.name?.charAt(0) ?? "T"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CareBridge</h1>
              <p className="text-sm text-gray-400">{profile?.name ?? "Therapist"}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationBell liveEvent={lastEvent} />
            <Button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="w-full bg-gray-800/30 border-b border-gray-700/50 px-6 md:px-12 py-3 flex gap-4 flex-wrap">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "profile", label: "My Profile" },
          { id: "patients", label: "My Patients" },
          { id: "appointments", label: "Appointments" },
          { id: "availability", label: "📅 Availability" },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === item.id
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <div className="w-full px-6 md:px-12 py-8">
        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total",     value: stats?.totalAppointments ?? appointments.length,                                     color: "from-slate-600 to-slate-700",   icon: "📋" },
                { label: "Pending",   value: stats?.pendingCount   ?? appointments.filter(a => a.status === "PENDING").length,    color: "from-amber-600 to-orange-700",  icon: "⏳" },
                { label: "Accepted",  value: stats?.acceptedCount  ?? appointments.filter(a => a.status === "ACCEPTED").length,   color: "from-emerald-600 to-green-700", icon: "✅" },
                { label: "Completed", value: stats?.completedCount ?? appointments.filter(a => a.status === "COMPLETED").length,  color: "from-blue-600 to-cyan-700",     icon: "🎉" },
                { label: "Rejected",  value: stats?.rejectedCount  ?? appointments.filter(a => a.status === "REJECTED").length,   color: "from-rose-600 to-red-700",      icon: "❌" },
                { label: "Rating",    value: `${(stats?.averageRating ?? profile?.rating ?? 0).toFixed(1)} ⭐`,                  color: "from-yellow-500 to-orange-600", icon: "🌟" },
              ].map(stat => (
                <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-xl`}>
                  <div className="text-xl mb-1">{stat.icon}</div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-xs opacity-75 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Monthly Chart */}
            {stats?.monthlyChart?.length > 0 && (
              <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4">📈 Appointments — Last 6 Months</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 12, color: "#f9fafb" }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}


            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => setActiveView("profile")}
                className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-6 text-white text-left transition-all shadow-lg border border-slate-600"
              >
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-xl font-bold mb-2">Edit Profile</h3>
                <p className="text-gray-300">Update your information</p>
              </button>
              <button
                onClick={() => setActiveView("patients")}
                className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-6 text-white text-left transition-all shadow-lg border border-slate-600"
              >
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-xl font-bold mb-2">View Patients</h3>
                <p className="text-gray-300">Manage your patient list</p>
              </button>
              <button
                onClick={() => setActiveView("appointments")}
                className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-6 text-white text-left transition-all shadow-lg border border-slate-600"
              >
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-xl font-bold mb-2">Appointments</h3>
                <p className="text-gray-300">Review appointment requests</p>
              </button>
            </div>

            {/* Recent Appointments */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Pending Appointments</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {appointments.filter(a => a.status === "PENDING").length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No pending appointments</p>
                ) : (
                  appointments
                    .filter(a => a.status === "PENDING")
                    .map(apt => (
                      <div key={apt.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">{apt.patientName}</h3>
                            <p className="text-sm text-gray-400">{apt.disease}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-orange-400 bg-orange-600/20 px-3 py-1 rounded-full">
                              PENDING
                            </p>
                          </div>
                        </div>
                        {apt.message && (
                          <p className="text-sm text-gray-300 mb-3 italic">"{apt.message}"</p>
                        )}
                        <div className="flex gap-3">
                          <Link to={`/appointments/${apt.id}`} className="flex-1">
                            <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg py-2">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            onClick={() => handleAcceptAppointment(apt.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                          >
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleRejectAppointment(apt.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile View */}
        {activeView === "profile" && profile && (
          <div className="max-w-2xl bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <h2 className="text-3xl font-bold text-white mb-8">My Profile</h2>
            {isEditingProfile && editForm ? (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-400">Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full mt-2 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Email (Read-only)</label>
                  <p className="text-lg text-gray-300 mt-2">{editForm.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full mt-2 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Search & Change Disease Specializations</label>
                  <input
                    type="text"
                    placeholder="Search disease (Diabetes, Hypertension, Asthma...)"
                    value={specSearch}
                    onChange={(e) => setSpecSearch(e.target.value)}
                    className="w-full mt-2 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-400 text-sm"
                  />
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-800/50 rounded-lg max-h-40 overflow-y-auto">
                    {diseases
                      .filter(disease => disease.toLowerCase().includes(specSearch.toLowerCase()))
                      .map((disease) => (
                        <button
                          key={disease}
                          type="button"
                          onClick={() => {
                            const current = editForm.specializations || [];
                            if (current.includes(disease)) {
                              setEditForm({ ...editForm, specializations: current.filter(s => s !== disease) });
                            } else {
                              setEditForm({ ...editForm, specializations: [...current, disease] });
                            }
                          }}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                            editForm.specializations?.includes(disease)
                              ? "bg-indigo-600 text-white shadow-lg"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {disease}
                        </button>
                      ))}
                  </div>
                  {editForm.specializations && editForm.specializations.length > 0 ? (
                    <p className="text-xs text-gray-400 mt-2">Selected: <strong>{editForm.specializations.join(", ")}</strong></p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">Select diseases</p>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={editLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    disabled={editLoading}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-400">Full Name</label>
                  <p className="text-xl text-white mt-2">{profile.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Email</label>
                  <p className="text-xl text-white mt-2">{profile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Phone</label>
                  <p className="text-xl text-white mt-2">{profile.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Disease Specialized In</label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-blue-600/30 text-blue-100 px-4 py-2 rounded-full text-sm font-medium">
                      {profile.specialization}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Rating</label>
                  <p className="text-2xl text-white mt-2">{profile.rating?.toFixed(1)} ⭐</p>
                </div>
                <Button
                  onClick={handleEditProfileClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Patients View */}
        {activeView === "patients" && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <h2 className="text-3xl font-bold text-white mb-6">My Patients</h2>
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No patients yet</p>
              ) : (
                appointments
                  .filter((apt, idx, arr) => idx === arr.findIndex((a) => a.patientEmail === apt.patientEmail))
                  .map((apt) => (
                    <div key={apt.patientEmail} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-white">{apt.patientName}</h3>
                        <p className="text-sm text-gray-400">Email: {apt.patientEmail}</p>
                      </div>
                      <Link to={`/appointments/${apt.id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Appointments View */}
        {activeView === "appointments" && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <h2 className="text-3xl font-bold text-white mb-6">All Appointments</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {appointments.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No appointments yet</p>
              ) : (
                appointments.map(apt => (
                  <div key={apt.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{apt.patientName}</h3>
                        <p className="text-sm text-gray-400">{apt.disease}</p>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        apt.status === "PENDING" ? "bg-yellow-600/20 text-yellow-400" :
                        apt.status === "ACCEPTED" ? "bg-green-600/20 text-green-400" :
                        apt.status === "REJECTED" ? "bg-red-600/20 text-red-400" :
                        apt.status === "COMPLETED" ? "bg-blue-600/20 text-blue-400" :
                        apt.status === "CANCELLED" ? "bg-slate-700 text-slate-300" :
                        "bg-orange-600/20 text-orange-400"
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <Link to={`/appointments/${apt.id}`} className="flex-1">
                        <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg py-2">
                          View Details
                        </Button>
                      </Link>
                      {apt.status === "PENDING" && (
                        <>
                          <Button
                            onClick={() => handleAcceptAppointment(apt.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg py-2"
                          >
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleRejectAppointment(apt.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg py-2"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* Availability Management */}
        {activeView === "availability" && (
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-8 space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-white">📅 Manage Your Availability</h2>

            {availMsg && (
              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-3 text-indigo-300 text-sm font-semibold">
                {availMsg}
              </div>
            )}

            {/* Slot Viewer */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">View & Manage Slots</h3>
              <div className="flex gap-3 items-center mb-4">
                <input
                  type="date"
                  value={availDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => { setAvailDate(e.target.value); fetchProviderSlots(e.target.value); }}
                  className="bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm"
                />
                <button
                  onClick={() => fetchProviderSlots(availDate)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Load Slots
                </button>
              </div>

              {availLoading ? (
                <p className="text-gray-400 text-sm">Loading slots...</p>
              ) : availSlots.length === 0 ? (
                <p className="text-gray-400 text-sm">No slots found. Click "Load Slots" to generate them.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {availSlots.map((slot: any) => (
                    <button
                      key={slot.id}
                      onClick={() => handleToggleSlot(slot.id, slot.available)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                        slot.available
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                          : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 line-through"
                      }`}
                      title={slot.available ? "Click to disable" : "Click to enable"}
                    >
                      {slot.startTime}
                      <span className="block text-[10px] mt-0.5 opacity-70">{slot.available ? "Open" : "Blocked"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Leave Management */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">🏖️ Mark Leave Day</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-gray-400 text-xs font-semibold block mb-1">Leave Date</label>
                  <input
                    type="date"
                    value={leaveDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setLeaveDate(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="text-gray-400 text-xs font-semibold block mb-1">Reason (Optional)</label>
                  <input
                    type="text"
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                    placeholder="e.g. Personal leave"
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleMarkLeave}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-sm font-semibold"
                >
                  Mark Leave
                </button>
                <button
                  onClick={fetchLeaves}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Refresh
                </button>
              </div>

              {leaveList.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Scheduled Leaves</p>
                  {leaveList.map((leave: any) => (
                    <div key={leave.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl px-4 py-2 border border-gray-600">
                      <div>
                        <p className="text-white text-sm font-semibold">{leave.leaveDate}</p>
                        <p className="text-gray-400 text-xs">{leave.reason || "No reason specified"}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveLeave(leave.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TherapistDashboard;