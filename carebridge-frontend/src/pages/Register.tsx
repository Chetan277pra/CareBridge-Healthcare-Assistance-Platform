import { useEffect, useState, type ChangeEvent } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LocationPicker from "@/components/LocationPicker";

const roles = [
  { 
    value: "PATIENT", 
    label: "Patient", 
    description: "Start your health journey with AI-driven insights.",
    quote: "Prevention is better than cure.",
    image: "https://images.unsplash.com/photo-1576091160550-112173f7f869?w=1200&h=1400&fit=crop"
  },
  { 
    value: "THERAPIST", 
    label: "Therapist", 
    description: "Join as a healthcare professional.",
    quote: "Compassion drives excellence in care.",
    image: "https://images.unsplash.com/photo-1576091160650-2173dba999ef?w=1200&h=1400&fit=crop"
  },
  { 
    value: "HOSPITAL", 
    label: "Hospital", 
    description: "Register your healthcare institution.",
    quote: "Together, we heal communities.",
    image: "https://images.unsplash.com/photo-1576091160653-f173d7d408f5?w=1200&h=1400&fit=crop"
  },
];

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


function Register() {
  type HospitalOption = { id: number; name: string; location?: string | null };

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [selectedSpecializations, setSelectedSpecializations] = useState<Set<string>>(new Set());
  const [specSearch, setSpecSearch] = useState("");
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [freelancing, setFreelancing] = useState(true);
  const [locationQuery, setLocationQuery] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const currentRole = roles.find(r => r.value === role);
  const needsDisease = role !== "PATIENT";
  const isTherapist = role === "THERAPIST";
  const filteredDiseases = diseases.filter(disease => 
    disease.toLowerCase().includes(specSearch.toLowerCase())
  );
  const filteredHospitals = hospitals.filter((hospital) => {
    const query = hospitalSearch.toLowerCase();
    return (
      hospital.name?.toLowerCase().includes(query) ||
      (hospital.location ?? "").toLowerCase().includes(query) ||
      String(hospital.id).includes(query)
    );
  });

  useEffect(() => {
    axios.get("http://localhost:8080/api/hospital")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const options = data
          .filter((h: any) => h && h.id !== undefined && h.name)
          .map((h: any) => ({ id: Number(h.id), name: String(h.name), location: h.location ?? "" }));
        setHospitals(options);
      })
      .catch(() => {
        setHospitals([]);
      });
  }, []);

  const toggleSpecialization = (disease: string) => {
    const newSet = new Set(selectedSpecializations);
    if (newSet.has(disease)) {
      newSet.delete(disease);
    } else {
      newSet.add(disease);
    }
    setSelectedSpecializations(newSet);
  };

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (latitude === null || longitude === null) {
      setError("Please select your location on the map before continuing.");
      return;
    }

    if (needsDisease && selectedSpecializations.size === 0) {
      setError("Please select at least one disease you can treat.");
      return;
    }

    if (isTherapist && !freelancing && selectedHospitalId === null) {
      setError("Please select one hospital ID or choose freelancing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const registerData: any = {
        fullName,
        email,
        phone,
        password,
        role,
      };

      if (needsDisease) {
        registerData.specializations = Array.from(selectedSpecializations);
      }

      if (isTherapist) {
        registerData.freelancing = freelancing;
        registerData.affiliatedHospitalId = selectedHospitalId;
      }

      registerData.location = locationQuery;
      registerData.latitude = latitude;
      registerData.longitude = longitude;

      await axios.post("http://localhost:8080/api/auth/register", registerData);

      navigate("/login");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Registration failed!";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRegister();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* ROLE SELECTION - ABSOLUTELY FIRST */}
          <div className="mb-10 p-8 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl border-4 border-indigo-500 shadow-lg">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-6">🎯 Choose Your Role</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {roles.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setRole(value);
                    setSelectedSpecializations(new Set());
                    setSpecSearch("");
                    setHospitalSearch("");
                    setSelectedHospitalId(null);
                    setFreelancing(true);
                  }}
                  className={`p-6 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
                    role === value
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl scale-105 border-4 border-indigo-700"
                      : "bg-white text-gray-800 hover:bg-gray-50 shadow-lg border-2 border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  <div className="text-2xl mb-2">{value === "PATIENT" ? "👤" : value === "THERAPIST" ? "👨‍⚕️" : "🏥"}</div>
                  <div>{label}</div>
                  <div className="text-xs mt-2 opacity-80">{description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Title */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Create Your Account
            </h1>
            <p className="text-gray-600 text-lg">As a <span className="font-bold text-indigo-600">{currentRole?.label}</span></p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-100 border-2 border-red-400 text-red-700 font-semibold">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-6">

            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Full Name *</label>
              <Input
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white text-gray-900 border-2 border-gray-300 h-12 rounded-xl text-base shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email Address *</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white text-gray-900 border-2 border-gray-300 h-12 rounded-xl text-base shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Phone Number *</label>
              <Input
                placeholder="10-digit phone number"
                value={phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white text-gray-900 border-2 border-gray-300 h-12 rounded-xl text-base shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Password *</label>
              <Input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white text-gray-900 border-2 border-gray-300 h-12 rounded-xl text-base shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Confirm Password *</label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white text-gray-900 border-2 border-gray-300 h-12 rounded-xl text-base shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>

            <div className="rounded-3xl border-2 border-gray-300/50 bg-gradient-to-br from-slate-50 to-blue-50 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-bold text-gray-800">📍 Your Location</p>
                  <p className="text-sm text-gray-600">Search your address and place the pin on the map for accurate location.</p>
                </div>
              </div>
              <LocationPicker
                apiKey={googleMapsKey}
                label="Select your current location"
                query={locationQuery}
                latitude={latitude}
                longitude={longitude}
                onQueryChange={setLocationQuery}
                onCoordinatesChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </div>

            {/* Disease Selection (for Therapist/Hospital) */}
            {needsDisease && (
              <div className="space-y-4">
                <label className="text-lg font-semibold text-gray-800">Specializations *</label>
                <p className="text-sm text-gray-600">Select the diseases you can treat or specialize in.</p>
                <input
                  type="text"
                  placeholder="Search diseases (Diabetes, Hypertension, Asthma...)"
                  value={specSearch}
                  onChange={(e) => setSpecSearch(e.target.value)}
                  className="w-full bg-white text-gray-900 border-2 border-gray-300 h-12 rounded-xl text-base px-4 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
                <div className="flex flex-wrap gap-3 p-4 bg-white/80 rounded-2xl max-h-64 overflow-y-auto shadow-inner border border-gray-200">
                  {filteredDiseases.length === 0 ? (
                    <p className="text-sm text-gray-500 w-full text-center py-8">No diseases match. Try a different search term.</p>
                  ) : filteredDiseases.map(disease => (
                    <button
                      key={disease}
                      type="button"
                      onClick={() => toggleSpecialization(disease)}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                        selectedSpecializations.has(disease)
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm"
                      }`}
                    >
                      {disease}
                    </button>
                  ))}
                </div>
                {selectedSpecializations.size > 0 && (
                  <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
                    <p className="text-sm font-semibold text-indigo-800 mb-2">Selected Specializations:</p>
                    <p className="text-sm text-indigo-700">{Array.from(selectedSpecializations).join(", ")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Therapist Hospital Affiliation */}
            {isTherapist && (
              <div className="space-y-4 rounded-3xl border-2 border-gray-300/50 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 shadow-xl">
                <label className="text-lg font-semibold text-gray-800">Therapist Work Mode *</label>
                <div className="flex items-center gap-3">
                  <input
                    id="freelancing"
                    type="checkbox"
                    checked={freelancing}
                    onChange={(e) => setFreelancing(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <label htmlFor="freelancing" className="text-sm text-gray-700">
                    I also want to work as a freelancer
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Select One Hospital (Optional if freelancing)</label>
                  <input
                    type="text"
                    placeholder="Search by hospital name, location, or ID"
                    value={hospitalSearch}
                    onChange={(e) => setHospitalSearch(e.target.value)}
                    className="w-full bg-white text-gray-900 border-2 border-gray-300 h-12 rounded-xl text-base px-4 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  />

                  <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3">
                    {filteredHospitals.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No hospitals found.</p>
                    ) : filteredHospitals.map((hospital) => (
                      <button
                        key={hospital.id}
                        type="button"
                        onClick={() => setSelectedHospitalId(hospital.id)}
                        className={`mb-2 w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                          selectedHospitalId === hospital.id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-semibold">{hospital.name}</p>
                        <p className="text-xs opacity-80">ID: {hospital.id} {hospital.location ? `| ${hospital.location}` : ""}</p>
                      </button>
                    ))}
                  </div>

                  {selectedHospitalId !== null && (
                    <p className="text-sm font-medium text-emerald-700">Selected Hospital ID: {selectedHospitalId}</p>
                  )}
                </div>
              </div>
            )}

            {/* Register Button */}
            <Button
              onClick={handleRegister}
              disabled={loading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl shadow-lg disabled:opacity-50 transform hover:scale-105 transition-all"
            >
              {loading ? "Creating Account..." : "🚀 Create Account"}
            </Button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-300">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold text-lg transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
