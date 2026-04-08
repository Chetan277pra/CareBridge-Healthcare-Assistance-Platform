import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";

interface AppointmentRequest {
  id: string;
  patientName: string;
  patientEmail: string;
  disease: string;
  requiredSpecialization: string;
  status: "pending" | "accepted" | "rejected";
}

interface Hospital {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  rating: number;
  totalDoctors: number;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  rating: number;
}

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

function HospitalDashboard() {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"dashboard" | "profile" | "doctors" | "patients" | "requests">("dashboard");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Hospital | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [specSearch, setSpecSearch] = useState("");

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
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch hospital profile
      const hospitalRes = await axios.get(
        `http://localhost:8080/api/hospital/profile?email=${email}`,
        { headers }
      );
      setHospital(hospitalRes.data);

      // Fetch hospital appointment requests
      const requestsRes = await axios.get(
        `http://localhost:8080/api/appointments/hospital?email=${email}`,
        { headers }
      );
      setRequests(requestsRes.data.map((request: any) => ({
        id: request.id?.toString() ?? request.patientEmail,
        patientName: request.patientName,
        patientEmail: request.patientEmail,
        disease: request.disease,
        requiredSpecialization: request.specialization || "General Medicine",
        status: request.status,
      })));

      // Fetch nearby doctors for hospital dashboard
      const doctorsRes = await axios.get("http://localhost:8080/api/therapist", { headers });
      setDoctors(doctorsRes.data.map((doctor: any) => ({
        id: doctor.id?.toString() ?? doctor.email,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        rating: doctor.rating,
      })));
    } catch (err) {
      console.log("Using mock data");
      // Mock data fallback
      setHospital({
        id: "h1",
        name: "Central Medical Complex",
        email: localStorage.getItem("userEmail") || "hospital@carebridge.com",
        phone: "+1-555-2020",
        specialization: "Multi-specialty",
        rating: 4.7,
        totalDoctors: 8,
      });
      setDoctors([
        { id: "1", name: "Dr. Sarah Johnson", email: "sarah@example.com", specialization: "Cardiology", rating: 4.8 },
        { id: "2", name: "Dr. Michael Chen", email: "michael@example.com", specialization: "Neurology", rating: 4.6 },
        { id: "3", name: "Dr. Emily Roberts", email: "emily@example.com", specialization: "Dermatology", rating: 4.9 },
      ]);
      setRequests([
        {
          id: "r1",
          patientName: "John Doe",
          patientEmail: "john@email.com",
          disease: "Hypertension",
          requiredSpecialization: "Cardiology",
          status: "pending",
        },
        {
          id: "r2",
          patientName: "Jane Smith",
          patientEmail: "jane@email.com",
          disease: "Migraine",
          requiredSpecialization: "Neurology",
          status: "pending",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      await axios.put(
        `http://localhost:8080/api/appointments/${id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" } : r));
    } catch (err) {
      // Mock accept
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" } : r));
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await axios.put(
        `http://localhost:8080/api/appointments/${id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
    } catch (err) {
      // Mock reject
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const handleEditProfileClick = () => {
    if (hospital) {
      setEditForm({ ...hospital });
      setIsEditingProfile(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditForm(null);
  };

  const handleSaveProfile = async () => {
    if (!editForm) return;
    setEditLoading(true);
    try {
      const email = localStorage.getItem("userEmail");
      const response = await axios.put(
        `http://localhost:8080/api/hospital/profile?email=${email}`,
        {
          name: editForm.name,
          phone: editForm.phone,
          specialization: editForm.specialization,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      console.log("Profile updated:", response.data);
      setHospital(editForm);
      setIsEditingProfile(false);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error("Failed to update profile", err);
      alert("Error updating profile: " + (err.response?.data?.message || err.message));
    } finally {
      setEditLoading(false);
    }
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
      <div className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-red-400/20">
        <div className="w-full px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
              H
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CareBridge</h1>
              <p className="text-sm text-gray-400">{hospital?.name}</p>
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
          { id: "profile", label: "Hospital Profile" },
          { id: "doctors", label: "Doctors" },
          { id: "patients", label: "Patients" },
          { id: "requests", label: "Requests" },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === item.id
                ? "bg-red-600 text-white"
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
              <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-red-100">Pending Requests</p>
                <p className="text-4xl font-bold mt-2">{requests.filter(r => r.status === "pending").length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-green-100">Accepted</p>
                <p className="text-4xl font-bold mt-2">{requests.filter(r => r.status === "accepted").length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-orange-100">Doctors</p>
                <p className="text-4xl font-bold mt-2">{Math.max(doctors.length, hospital?.totalDoctors || 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-sm font-semibold text-purple-100">Rating</p>
                <p className="text-4xl font-bold mt-2">{hospital?.rating !== undefined ? hospital.rating.toFixed(1) : "0.0"} ⭐</p>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => setActiveView("profile")}
                className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-6 text-white text-left transition-all shadow-lg border border-slate-600"
              >
                <div className="text-4xl mb-4">🏥</div>
                <h3 className="text-xl font-bold mb-2">Edit Profile</h3>
                <p className="text-gray-300">Update hospital information</p>
              </button>
              <button
                onClick={() => setActiveView("doctors")}
                className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-6 text-white text-left transition-all shadow-lg border border-slate-600"
              >
                <div className="text-4xl mb-4">👨‍⚕️</div>
                <h3 className="text-xl font-bold mb-2">Manage Doctors</h3>
                <p className="text-gray-300">Manage your doctor network</p>
              </button>
              <button
                onClick={() => setActiveView("requests")}
                className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-6 text-white text-left transition-all shadow-lg border border-slate-600"
              >
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-bold mb-2">Requests</h3>
                <p className="text-gray-300">Review appointment requests</p>
              </button>
            </div>

            {/* Pending Requests */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Pending Appointment Requests</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {requests.filter(r => r.status === "pending").length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No pending requests</p>
                ) : (
                  requests
                    .filter(r => r.status === "pending")
                    .map(req => (
                      <div key={req.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">{req.patientName}</h3>
                            <p className="text-sm text-gray-400">Disease: {req.disease}</p>
                            <p className="text-sm text-gray-400">Specialization: {req.requiredSpecialization}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-orange-400 bg-orange-600/20 px-3 py-1 rounded-full">
                              Pending
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                          >
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(req.id)}
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
        {activeView === "profile" && hospital && (
          <div className="max-w-2xl bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <h2 className="text-3xl font-bold text-white mb-8">Hospital Profile</h2>
            {isEditingProfile && editForm ? (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-400">Hospital Name</label>
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
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full mt-2 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Search & Change Disease Specialization</label>
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
                          onClick={() => setEditForm({ ...editForm, specialization: disease })}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                            editForm.specialization === disease
                              ? "bg-indigo-600 text-white shadow-lg"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {disease}
                        </button>
                      ))}
                  </div>
                  {editForm.specialization ? (
                    <p className="text-xs text-gray-400 mt-2">Current: <strong>{editForm.specialization}</strong></p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">Select a disease</p>
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
                  <label className="text-sm font-semibold text-gray-400">Hospital Name</label>
                  <p className="text-xl text-white mt-2">{hospital.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Email</label>
                  <p className="text-xl text-white mt-2">{hospital.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Phone</label>
                  <p className="text-xl text-white mt-2">{hospital.phone || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Specialization</label>
                  <p className="text-xl text-white mt-2">{hospital.specialization}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Rating</label>
                  <p className="text-2xl text-white mt-2">{hospital.rating} ⭐</p>
                </div>
                <Button 
                  onClick={handleEditProfileClick}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg mt-8"
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Doctors View */}
        {activeView === "doctors" && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <h2 className="text-3xl font-bold text-white mb-6">Doctor Network</h2>
            <div className="space-y-4">
              {doctors.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No doctors found yet. Add new provider profiles in the backend.</p>
              ) : (
                doctors.map(doctor => (
                  <div key={doctor.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{doctor.name}</h3>
                      <p className="text-sm text-gray-400">Specialization: {doctor.specialization}</p>
                      <p className="text-sm text-gray-400">{doctor.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-yellow-300">{doctor.rating !== undefined ? doctor.rating.toFixed(1) : "0.0"} ⭐</span>
                      <Button className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg px-6 py-2">
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Patients View */}
        {activeView === "patients" && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <h2 className="text-3xl font-bold text-white mb-6">Referred Patients</h2>
            <div className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No patient referrals have been received yet.</p>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{req.patientName}</h3>
                      <p className="text-sm text-gray-400">Email: {req.patientEmail}</p>
                      <p className="text-sm text-gray-400">Condition: {req.disease}</p>
                      <p className="text-sm text-gray-400">Specialization: {req.requiredSpecialization}</p>
                    </div>
                    <Button className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg px-6 py-2">
                      View Details
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Requests View */}
        {activeView === "requests" && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <h2 className="text-3xl font-bold text-white mb-6">All Appointment Requests</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {requests.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No requests yet</p>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{req.patientName}</h3>
                        <p className="text-sm text-gray-400">{req.disease} - {req.requiredSpecialization}</p>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        req.status === "pending" ? "bg-orange-600/20 text-orange-400" :
                        req.status === "accepted" ? "bg-green-600/20 text-green-400" :
                        "bg-red-600/20 text-red-400"
                      }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                    {req.status === "pending" && (
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg py-2"
                        >
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleRejectRequest(req.id)}
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

export default HospitalDashboard;