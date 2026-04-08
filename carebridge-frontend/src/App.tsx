import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HospitalDashboard from "./pages/HospitalDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import PatientAppointments from "./pages/PatientAppointments";
import Assessment from "./pages/Assessment";
import Results from "./pages/Results";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/appointments" element={<PatientAppointments />} />
      <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
      <Route path="/therapist-dashboard" element={<TherapistDashboard />} />
      <Route path="/assessment" element={<Assessment />} />
      <Route path="/results" element={<Results />} />
    </Routes>
  );
}

export default App;