import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LocationPicker from "@/components/LocationPicker";
import axios from "axios";

const symptomList = [
  "itching", "skin_rash", "nodal_skin_eruptions", "continuous_sneezing", "shivering", "chills", "joint_pain", "stomach_pain", "acidity", "ulcers_on_tongue", "muscle_wasting", "vomiting", "burning_micturition", "spotting_ urination", "fatigue", "weight_gain", "anxiety", "cold_hands_and_feets", "mood_swings", "weight_loss", "restlessness", "lethargy", "patches_in_throat", "irregular_sugar_level", "cough", "high_fever", "sunken_eyes", "breathlessness", "sweating", "dehydration", "indigestion", "headache", "yellowish_skin", "dark_urine", "nausea", "loss_of_appetite", "pain_behind_the_eyes", "back_pain", "constipation", "abdominal_pain", "diarrhoea", "mild_fever", "yellow_urine", "yellowing_of_eyes", "acute_liver_failure", "fluid_overload", "swelling_of_stomach", "swelled_lymph_nodes", "malaise", "blurred_and_distorted_vision", "phlegm", "throat_irritation", "redness_of_eyes", "sinus_pressure", "runny_nose", "congestion", "chest_pain", "weakness_in_limbs", "pain_during_bowel_movements", "pain_in_anal_region", "bloody_stool", "irritation_in_anus", "neck_pain", "dizziness", "cramps", "bruising", "obesity", "swollen_legs", "swollen_blood_vessels", "puffy_face_and_eyes", "enlarged_thyroid", "brittle_nails", "swollen_extremeties", "excessive_hunger", "extra_marital_contacts", "drying_and_tingling_lips", "slurred_speech", "knee_pain", "hip_joint_pain", "muscle_weakness", "stiff_neck", "swelling_joints", "movement_stiffness", "spinning_movements", "loss_of_balance", "unsteadiness", "weakness_of_one_body_side", "loss_of_smell", "bladder_discomfort", "foul_smell_of urine", "continuous_feel_of_urine", "passage_of_gases", "internal_itching", "toxic_look_(typhos)", "depression", "irritability", "muscle_pain", "altered_sensorium", "red_spots_over_body", "belly_pain", "abnormal_menstruation", "dischromic _patches", "watering_from_eyes", "increased_appetite", "polyuria", "family_history", "mucoid_sputum", "rusty_sputum", "lack_of_concentration", "visual_disturbances", "receiving_blood_transfusion", "receiving_unsterile_injections", "coma", "stomach_bleeding", "distention_of_abdomen", "history_of_alcohol_consumption", "fluid_overload.1", "blood_in_sputum", "prominent_veins_on_calf", "palpitations", "painful_walking", "pus_filled_pimples", "blackheads", "scurring", "skin_peeling", "silver_like_dusting", "small_dents_in_nails", "inflammatory_nails", "blister", "red_sore_around_nose", "yellow_crust_ooze"
];

const relatedSymptomMap: Record<string, string[]> = {
  high_fever: ["mild_fever", "chills", "sweating", "fatigue", "headache"],
  mild_fever: ["high_fever", "chills", "sweating", "loss_of_appetite", "nausea"],
  cough: ["phlegm", "throat_irritation", "congestion", "runny_nose", "breathlessness"],
  headache: ["dizziness", "blurred_and_distorted_vision", "nausea", "neck_pain"],
  chest_pain: ["breathlessness", "palpitations", "weakness_in_limbs", "dizziness", "sweating"],
  yellowish_skin: ["yellowing_of_eyes", "dark_urine", "abdominal_pain", "loss_of_appetite", "fatigue"],
  weight_loss: ["loss_of_appetite", "excessive_hunger", "fatigue", "vomiting", "diarrhoea"],
  abdominal_pain: ["indigestion", "nausea", "constipation", "diarrhoea", "belly_pain"],
};

interface AssessmentForm {
  age: string;
  weight: string;
  height: string;
  bmi: string;
  symptoms: Set<string>;
  locationQuery: string;
  latitude: number | null;
  longitude: number | null;
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b(\w)/g, (match) => match.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function Assessment() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<AssessmentForm>({
    age: "",
    weight: "",
    height: "",
    bmi: "",
    symptoms: new Set<string>(),
    locationQuery: "",
    latitude: null,
    longitude: null,
  });
  const navigate = useNavigate();

  const isStepOneValid =
    formData.age.trim() !== "" &&
    formData.weight.trim() !== "" &&
    formData.height.trim() !== "";

  const totalSteps = 3;
  const progressPercentage = (step / totalSteps) * 100;

  const randomizedSymptoms = useMemo(() => shuffleArray(symptomList), []);

  const filteredSymptoms = useMemo(
    () => randomizedSymptoms.filter((symptom) =>
      formatLabel(symptom).toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [randomizedSymptoms, searchTerm]
  );

  const relatedSuggestions = useMemo(() => {
    const suggestions = Array.from(formData.symptoms).flatMap((symptom) => relatedSymptomMap[symptom] ?? []);
    return Array.from(new Set(suggestions))
      .filter((suggestion) => !formData.symptoms.has(suggestion))
      .slice(0, 6);
  }, [formData.symptoms]);

  const toggleSymptom = (symptom: string) => {
    const newSymptoms = new Set(formData.symptoms);
    if (newSymptoms.has(symptom)) {
      newSymptoms.delete(symptom);
    } else {
      newSymptoms.add(symptom);
    }
    setFormData({ ...formData, symptoms: newSymptoms });
  };

  const calculateBMI = (wt: string, ht: string) => {
    if (wt && ht) {
      const weight = parseFloat(wt);
      const height = parseFloat(ht) / 100;
      const bmi = (weight / (height * height)).toFixed(1);
      setFormData(prev => ({ ...prev, bmi }));
    }
  };

  const handleWeightChange = (e: ChangeEvent<HTMLInputElement>) => {
    const weight = e.target.value;
    setFormData(prev => ({ ...prev, weight }));
    calculateBMI(weight, formData.height);
  };

  const handleHeightChange = (e: ChangeEvent<HTMLInputElement>) => {
    const height = e.target.value;
    setFormData(prev => ({ ...prev, height }));
    calculateBMI(formData.weight, height);
  };

  const handleSubmit = async () => {
    if (!formData.age || !formData.weight || !formData.height || formData.symptoms.size === 0) {
      setFormError("Please fill all required fields and select at least one symptom.");
      return;
    }

    if (!formData.locationQuery || formData.latitude === null || formData.longitude === null) {
      setFormError("Please select your current location on the map before submitting.");
      return;
    }

    setFormError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const symptomsArray = Array.from(formData.symptoms);

      const res = await axios.post(
        "http://localhost:8080/api/prediction/analyze",
        {
          symptoms: symptomsArray,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          bmi: parseFloat(formData.bmi),
          location: formData.locationQuery,
          latitude: formData.latitude,
          longitude: formData.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      navigate("/results", { state: res.data });
    } catch (err) {
      setFormError("Assessment failed. Please confirm your location and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-3xl p-6 shadow-xl shadow-blue-100/40 backdrop-blur-md">
              <h3 className="text-2xl font-bold text-blue-700">📋 Step 1: Body Metrics</h3>
              <p className="text-gray-600 mt-2">Enter your age, weight, and height so the system can personalize your assessment.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-3 p-6 rounded-3xl bg-gradient-to-br from-white to-slate-100 border border-gray-200 shadow-sm">
                <label className="block text-lg font-semibold text-slate-700">Age *</label>
                <Input
                  type="number"
                  placeholder="Enter your age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="h-12 text-lg border-2 border-slate-300 focus:border-blue-500 rounded-2xl bg-white"
                  min="1"
                  max="120"
                />
              </div>
              <div className="space-y-3 p-6 rounded-3xl bg-gradient-to-br from-white to-slate-100 border border-gray-200 shadow-sm">
                <label className="block text-lg font-semibold text-slate-700">Weight (kg) *</label>
                <Input
                  type="number"
                  placeholder="Enter weight"
                  value={formData.weight}
                  onChange={handleWeightChange}
                  className="h-12 text-lg border-2 border-slate-300 focus:border-blue-500 rounded-2xl bg-white"
                  min="1"
                  max="500"
                />
              </div>
              <div className="space-y-3 p-6 rounded-3xl bg-gradient-to-br from-white to-slate-100 border border-gray-200 shadow-sm">
                <label className="block text-lg font-semibold text-slate-700">Height (cm) *</label>
                <Input
                  type="number"
                  placeholder="Enter height"
                  value={formData.height}
                  onChange={handleHeightChange}
                  className="h-12 text-lg border-2 border-slate-300 focus:border-blue-500 rounded-2xl bg-white"
                  min="50"
                  max="250"
                />
              </div>
              <div className="space-y-3 p-6 rounded-3xl bg-gradient-to-br from-slate-100 to-blue-50 border border-blue-200 shadow-sm">
                <label className="block text-lg font-semibold text-slate-700">BMI</label>
                <div className="h-12 px-4 rounded-2xl bg-white border-2 border-blue-200 flex items-center text-lg font-bold text-slate-900">
                  {formData.bmi ? `${formData.bmi}` : "—"}
                </div>
                <p className="text-sm text-slate-500">BMI updates automatically as you type.</p>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 border border-indigo-500/30 rounded-3xl p-6 shadow-xl shadow-indigo-100/40 backdrop-blur-md">
              <h3 className="text-2xl font-bold text-indigo-700">🔍 Step 2: Symptom Selection</h3>
              <p className="text-gray-600 mt-2">Choose the symptoms you are experiencing and use the search for faster selection.</p>
            </div>

            <div className="grid gap-4">
              <Input
                placeholder="Search symptoms... (fever, cough, headache...)"
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="h-12 text-base rounded-2xl border-2 border-slate-300 focus:border-indigo-500 bg-white shadow-sm"
              />

              {relatedSuggestions.length > 0 && (
                <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 shadow-sm">
                  <h4 className="font-bold text-violet-800 text-lg">💡 Suggested symptoms</h4>
                  <p className="text-sm text-violet-600 mt-1">These are related to what you've already selected.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {relatedSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => toggleSymptom(suggestion)}
                        className="rounded-full border-2 border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        + {formatLabel(suggestion)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSymptoms.slice(0, 72).map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => toggleSymptom(symptom)}
                    className={`group rounded-3xl border-2 p-5 text-left transition-all duration-300 ${
                      formData.symptoms.has(symptom)
                        ? "border-indigo-500 bg-gradient-to-br from-indigo-100 to-white text-indigo-900 shadow-lg"
                        : "border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold ${
                        formData.symptoms.has(symptom)
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}>
                        {formatLabel(symptom)[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{formatLabel(symptom)}</p>
                        <p className="text-sm text-slate-500 group-hover:text-slate-700">Tap to {formData.symptoms.has(symptom) ? "remove" : "add"}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 p-6 text-white shadow-2xl">
                <p className="font-semibold text-lg">Selected symptoms</p>
                <p className="mt-2 text-sm text-slate-200">{formData.symptoms.size} symptoms chosen. You can still add or remove before submission.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(formData.symptoms).slice(0, 10).map((symptom) => (
                    <span key={symptom} className="rounded-full bg-white/15 px-3 py-1 text-sm text-white">
                      {formatLabel(symptom)}
                    </span>
                  ))}
                  {formData.symptoms.size > 10 && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-sm text-white/80">
                      +{formData.symptoms.size - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-3xl p-6 shadow-xl shadow-emerald-100/40 backdrop-blur-md">
              <h3 className="text-2xl font-bold text-emerald-700">✅ Step 3: Review & Submit</h3>
              <p className="text-gray-600 mt-2">Confirm your information before sending it for diagnosis.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-bold text-slate-800">Body Metrics</h4>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Age", value: `${formData.age || "—"} yrs` },
                    { label: "Weight", value: `${formData.weight || "—"} kg` },
                    { label: "Height", value: `${formData.height || "—"} cm` },
                    { label: "BMI", value: formData.bmi || "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl text-white">
                <h4 className="text-lg font-bold text-white">Your Location</h4>
                <p className="mt-2 text-slate-200">Choose your current location so CareBridge can recommend the closest hospital.</p>
                <div className="mt-6">
                  <LocationPicker
                    apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                    label="Current position"
                    query={formData.locationQuery}
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onQueryChange={(value) => setFormData((prev) => ({ ...prev, locationQuery: value }))}
                    onCoordinatesChange={(lat, lng) => setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl text-white">
              <h4 className="text-lg font-bold text-white">Symptoms Summary</h4>
              <p className="mt-2 text-slate-200">You have selected {formData.symptoms.size} symptoms.</p>
              <div className="mt-4 grid gap-2 max-h-72 overflow-y-auto pr-2">
                {Array.from(formData.symptoms).map((symptom) => (
                  <span key={symptom} className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-100">
                    {formatLabel(symptom)}
                  </span>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || formData.symptoms.size === 0 || !formData.locationQuery || formData.latitude === null || formData.longitude === null}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-cyan-500 text-white hover:from-green-600 hover:to-cyan-600 rounded-3xl shadow-2xl transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin">⚙️</span>
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ⚡ Submit for Diagnosis
                </span>
              )}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="w-full max-w-none mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Health Assessment
              </h1>
              <p className="text-gray-600 mt-2 text-lg">AI-Powered Symptom Diagnosis</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">Step {step} of {totalSteps}</p>
              <p className="text-sm text-gray-500">{Math.round(progressPercentage)}% Complete</p>
            </div>
          </div>

          <div className="h-4 rounded-full bg-gray-300 overflow-hidden shadow-md">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {formError && (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">
              {formError}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl p-8 md:p-10">
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <Button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-8 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-50"
            >
              ← Previous
            </Button>

            <div className="text-center text-sm text-gray-500 font-medium">
              {step === totalSteps ? "Review step" : `Page ${step} of ${totalSteps}`}
            </div>

            {step < totalSteps && (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  onClick={() => setStep(Math.min(totalSteps, step + 1))}
                  disabled={step === 1 && !isStepOneValid}
                  className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg disabled:opacity-50"
                >
                  Next →
                </Button>
                {step === 1 && !isStepOneValid && (
                  <p className="text-sm text-red-600">Please enter age, weight, and height before continuing.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Assessment;
