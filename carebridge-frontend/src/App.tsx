import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HospitalDashboard from "./pages/HospitalDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import PatientAppointments from "./pages/PatientAppointments";
import AppointmentDetails from "./pages/AppointmentDetails";
import Assessment from "./pages/Assessment";
import Results from "./pages/Results";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn("Axios Interceptor Caught 401 on URL:", error.config?.url);
          console.warn("Token in localStorage at time of 401:", localStorage.getItem("token"));
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userEmail");
          navigate("/login");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/appointments" element={<PatientAppointments />} />
      <Route path="/appointments/:id" element={<AppointmentDetails />} />
      <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
      <Route path="/therapist-dashboard" element={<TherapistDashboard />} />
      <Route path="/assessment" element={<Assessment />} />
      <Route path="/results" element={<Results />} />
    </Routes>
  );
}

export default App;