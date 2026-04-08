import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";

interface Doctor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  rating: number;
}

interface Hospital {
  id: string;
  name: string;
  email: string;
  specialization: string;
  avgRating: number;
}

function Dashboard() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchText, setSearchText] = useState("");
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchText.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredHospitals = hospitals.filter((hospital) =>
    hospital.name.toLowerCase().includes(searchText.toLowerCase()) ||
    hospital.specialization.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const fetchProviders = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const doctorRes = await axios.get("http://localhost:8080/api/therapist", { headers });
        const hospitalRes = await axios.get("http://localhost:8080/api/hospital", { headers });

        setDoctors(doctorRes.data.map((doctor: any) => ({
          id: doctor.id?.toString() ?? doctor.email,
          name: doctor.name,
          email: doctor.email,
          specialization: doctor.specialization,
          rating: doctor.rating,
        })));

        setHospitals(hospitalRes.data.map((hospital: any) => ({
          id: hospital.id?.toString() ?? hospital.email,
          name: hospital.name,
          email: hospital.email,
          specialization: hospital.specialization,
          avgRating: hospital.rating,
        })));
      } catch (error) {
        setDoctors([
          { id: "1", name: "Dr. Sarah Johnson", email: "sarah@example.com", specialization: "Cardiology", rating: 4.8 },
          { id: "2", name: "Dr. Michael Chen", email: "michael@example.com", specialization: "Neurology", rating: 4.6 },
          { id: "3", name: "Dr. Emily Roberts", email: "emily@example.com", specialization: "Dermatology", rating: 4.9 },
          { id: "4", name: "Dr. James Wilson", email: "james@example.com", specialization: "Orthopedics", rating: 4.7 },
          { id: "5", name: "Dr. Lisa Anderson", email: "lisa@example.com", specialization: "Psychiatry", rating: 4.5 },
        ]);

        setHospitals([
          { id: "1", name: "Central Health Hospital", email: "central@hospital.com", specialization: "Multi-specialty", avgRating: 4.7 },
          { id: "2", name: "City Medical Center", email: "city@hospital.com", specialization: "Cardiology & Neurology", avgRating: 4.8 },
          { id: "3", name: "Sunrise Medical Complex", email: "sunrise@hospital.com", specialization: "Emergency & Trauma", avgRating: 4.6 },
          { id: "4", name: "Premier Health Institute", email: "premier@hospital.com", specialization: "Advanced Surgery", avgRating: 4.9 },
          { id: "5", name: "Community Care Hospital", email: "community@hospital.com", specialization: "General Medicine", avgRating: 4.5 },
        ]);
      }
    };

    fetchProviders();
  }, [navigate]);

  const handleBookAppointment = async (provider: Doctor | Hospital, type: 'therapist' | 'hospital') => {
    const patientEmail = localStorage.getItem("userEmail");
    if (!patientEmail) {
      setBookingStatus("Unable to locate your account. Please log in again.");
      return;
    }

    setBookingStatus(null);
    const providerId = `${type}-${provider.id}`;
    setBookingId(providerId);

    try {
      await axios.post("http://localhost:8080/api/appointments/request", {
        patientEmail,
        disease: "General Consultation",
        message: `Requesting appointment with ${provider.name}`,
        specialization: provider.specialization,
        therapistQuery: type === 'therapist' ? provider.name : undefined,
        hospitalQuery: type === 'hospital' ? provider.name : undefined,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      setBookingStatus(`Appointment request sent to ${provider.name}. Check your results page for status.`);
      setTimeout(() => setBookingId(null), 3000);
    } catch (error) {
      console.error(error);
      setBookingStatus("Unable to send appointment request. Please try again later.");
      setBookingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeInUp 0.8s ease-out; }
        .dashboard-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .dashboard-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .scroll-snap { scroll-snap-type: x mandatory; }
        .scroll-snap-item { scroll-snap-align: start; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="w-full mx-auto max-w-none px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            CareBridge
          </h1>
          <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-2">
            🚪 Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto max-w-none px-4 md:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center animate-fade-in">
          <div className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white mb-6">
            ❤️ Your Health Matters
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome to Your Health Dashboard
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Take AI-powered health assessments and connect with top-rated doctors and hospitals
          </p>
        </div>

        {/* Booking Status */}
        {bookingStatus && (
          <div className="mb-8 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-center animate-fade-in">
            {bookingStatus}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <label htmlFor="provider-search" className="block text-sm font-semibold text-gray-700 mb-2">
              Search doctors by name or specialty
            </label>
            <input
              id="provider-search"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search for Cardiology, Neurology, Psychiatry..."
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-indigo-200"
            />
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-2">Quick tip</p>
            <p className="text-gray-600">You can search by doctor name or by the disease/specialty you want treatment for. Then book directly from the card below.</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="animate-fade-in dashboard-card">
            <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-3xl">💊</span>
                </div>
                <CardTitle className="text-2xl">Take Assessment</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-blue-100 mb-6">
                  Get AI-powered diagnosis with 132 symptoms
                </p>
                <Link to="/assessment" className="block">
                  <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 rounded-xl">
                    Start Now →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in dashboard-card" style={{ animationDelay: "0.1s" }}>
            <Card className="shadow-xl border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-3xl">📊</span>
                </div>
                <CardTitle className="text-2xl">My History</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-green-100 mb-6">
                  View past assessments and recommendations
                </p>
                <Link to="/results" className="block">
                  <Button className="w-full bg-white text-green-600 hover:bg-green-50 font-bold py-3 rounded-xl">
                    View Results →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in dashboard-card" style={{ animationDelay: "0.2s" }}>
            <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-500 to-pink-600 text-white h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-3xl">📝</span>
                </div>
                <CardTitle className="text-2xl">Appointments</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-purple-100 mb-6">
                  Manage your appointments with doctors
                </p>
                <Link to="/appointments" className="block">
                  <Button className="w-full bg-white text-purple-600 hover:bg-purple-50 font-bold py-3 rounded-xl">
                    My Appointments →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Doctors Section */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="mb-6">
            <h3 className="text-3xl font-bold text-gray-800 mb-2">👨‍⚕️ Connect with Doctors</h3>
            <p className="text-gray-600">Browse our network of specialist doctors</p>
          </div>
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-6 min-w-min scroll-snap">
              {filteredDoctors.length === 0 ? (
                <div className="flex items-center justify-center w-full min-h-[220px] rounded-3xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-gray-500">
                  No doctors match that search. Try a different specialty or name.
                </div>
              ) : filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex-shrink-0 w-80 scroll-snap-item"
                >
                  <Card className="shadow-xl border-2 border-blue-200 hover:shadow-2xl transition-all h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-gray-800">{doctor.name}</CardTitle>
                          <CardDescription className="text-blue-600 font-semibold mt-1">
                            {doctor.specialization}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-500">⭐</div>
                          <p className="text-sm font-semibold text-gray-600">{doctor.rating}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{doctor.email}</p>
                      <Button
                        onClick={() => handleBookAppointment(doctor, 'therapist')}
                        disabled={bookingId === `therapist-${doctor.id}`}
                        className={`w-full font-bold rounded-xl py-2 transition-all ${
                          bookingId === `therapist-${doctor.id}`
                            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        {bookingId === `therapist-${doctor.id}` ? "⏳ Pending Approval" : "Book Appointment"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hospitals Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="mb-6">
            <h3 className="text-3xl font-bold text-gray-800 mb-2">🏥 Partner Hospitals</h3>
            <p className="text-gray-600">Find the best hospitals near you</p>
          </div>
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-6 min-w-min scroll-snap">
              {filteredHospitals.length === 0 ? (
                <div className="flex items-center justify-center w-full min-h-[220px] rounded-3xl border border-dashed border-gray-300 bg-white/80 p-8 text-center text-gray-500">
                  No hospitals match that search. Try a different specialty or name.
                </div>
              ) : filteredHospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className="flex-shrink-0 w-80 scroll-snap-item"
                >
                  <Card className="shadow-xl border-2 border-green-200 hover:shadow-2xl transition-all h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-gray-800">{hospital.name}</CardTitle>
                          <CardDescription className="text-green-600 font-semibold mt-1">
                            {hospital.specialization}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-500">⭐</div>
                          <p className="text-sm font-semibold text-gray-600">{hospital.avgRating}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{hospital.email}</p>
                      <Button
                        onClick={() => handleBookAppointment(hospital, 'hospital')}
                        disabled={bookingId === `hospital-${hospital.id}`}
                        className={`w-full font-bold rounded-xl py-2 transition-all ${
                          bookingId === `hospital-${hospital.id}`
                            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        {bookingId === `hospital-${hospital.id}` ? "⏳ Pending Approval" : "Request Appointment"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 p-8 bg-white rounded-3xl border-2 border-gray-300 shadow-xl animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">0</div>
              <p className="text-gray-600 font-semibold mt-2">Assessments Done</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">132</div>
              <p className="text-gray-600 font-semibold mt-2">Symptoms Available</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{doctors.length}</div>
              <p className="text-gray-600 font-semibold mt-2">Specialist Doctors</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{hospitals.length}</div>
              <p className="text-gray-600 font-semibold mt-2">Partner Hospitals</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;