import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  disease: string;
  date: string;
  status: "pending" | "accepted" | "rejected";
  message?: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  specializations: string[];
  rating: number;
  totalPatients: number;
}

function TherapistDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"dashboard" | "profile" | "patients" | "appointments">("dashboard");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Profile | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [specSearch, setSpecSearch] = useState("");
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
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("userEmail");

      // Fetch therapist profile
      const profileRes = await axios.get(
        `http://localhost:8080/api/therapist/profile?email=${email}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(profileRes.data);

      // Fetch appointments
      const appointmentsRes = await axios.get(
        `http://localhost:8080/api/appointments/therapist?email=${email}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointments(appointmentsRes.data);
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
          status: "pending",
          message: "Looking for consultation on blood pressure management",
        },
        {
          id: "a2",
          patientName: "Jane Smith",
          patientEmail: "jane@email.com",
          disease: "Migraine",
          date: new Date(Date.now() + 7200000).toISOString(),
          status: "pending",
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
        `http://localhost:8080/api/appointments/${appointmentId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "accepted" } : a)
      );
    } catch (err) {
      // Mock accept
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "accepted" } : a)
      );
    }
  };

  const handleRejectAppointment = async (appointmentId: string) => {
    try {
      await axios.put(
        `http://localhost:8080/api/appointments/${appointmentId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "rejected" } : a)
      );
    } catch (err) {
      // Mock reject
      setAppointments(it =>
        it.map(a => a.id === appointmentId ? { ...a, status: "rejected" } : a)
      );
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
        `http://localhost:8080/api/therapist/profile?email=${email}`,
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
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="w-full bg-gray-800/30 border-b border-gray-700/50 px-6 md:px-12 py-3 flex gap-4 flex-wrap">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "profile", label: "My Profile" },
          { id: "patients", label: "My Patients" },
          { id: "appointments", label: "Appointments" },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-blue-100">Pending Appointments</p>
                <p className="text-4xl font-bold mt-2">{appointments.filter(a => a.status === "pending").length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-green-100">Total Patients</p>
                <p className="text-4xl font-bold mt-2">{profile?.totalPatients || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-purple-100">Rating</p>
                <p className="text-4xl font-bold mt-2">{profile?.rating !== undefined ? profile.rating.toFixed(1) : "0.0"} ⭐</p>
              </div>
              <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-orange-100">Disease Specialized</p>
                <p className="text-xl font-bold mt-2 line-clamp-2">{profile?.specializations?.join(", ") ?? "N/A"}</p>
              </div>
            </div>

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
                {appointments.filter(a => a.status === "pending").length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No pending appointments</p>
                ) : (
                  appointments
                    .filter(a => a.status === "pending")
                    .map(apt => (
                      <div key={apt.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">{apt.patientName}</h3>
                            <p className="text-sm text-gray-400">{apt.disease}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-orange-400 bg-orange-600/20 px-3 py-1 rounded-full">
                              Pending
                            </p>
                          </div>
                        </div>
                        {apt.message && (
                          <p className="text-sm text-gray-300 mb-3 italic">"{apt.message}"</p>
                        )}
                        <div className="flex gap-3">
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
                      <Button
                        onClick={() => alert(`Patient: ${apt.patientName}\nEmail: ${apt.patientEmail}\nDisease: ${apt.disease}\nStatus: ${apt.status}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6"
                      >
                        View Details
                      </Button>
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
                        apt.status === "pending" ? "bg-orange-600/20 text-orange-400" :
                        apt.status === "accepted" ? "bg-green-600/20 text-green-400" :
                        "bg-red-600/20 text-red-400"
                      }`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>
                    {apt.status === "pending" && (
                      <div className="flex gap-3">
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
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TherapistDashboard;