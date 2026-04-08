import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="CareBridge ML Service", version="1.0.0")

# Load model
model = joblib.load("model.pkl")

# Recreate exact training feature columns
features = model.feature_names_in_
assets_dir = Path(__file__).parent / "assets"


class PredictionRequest(BaseModel):
    symptoms: list[str] = Field(default_factory=list)
    weight: float | None = None
    height: float | None = None
    bmi: float | None = None


class PredictionResponse(BaseModel):
    disease: str


def _read_json_list(filename: str) -> list[str]:
    file_path = assets_dir / filename
    with file_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return data if isinstance(data, list) else []

@app.get("/")
def home():
    return {"message": "ML service running", "status": "healthy"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/assets/symptoms", response_model=list[str])
def get_symptoms():
    return _read_json_list("symptoms.json")

@app.get("/assets/diseases", response_model=list[str])
def get_diseases():
    return _read_json_list("diseases.json")

@app.post("/predict")
def predict(data: PredictionRequest) -> PredictionResponse:
    user_symptoms = data.symptoms

    # Build full one-hot vector expected by model
    input_data = {feature: 0 for feature in features}

    for symptom in user_symptoms:
        if symptom in input_data:
            input_data[symptom] = 1

    df = pd.DataFrame([input_data])

    prediction: Any = model.predict(df)[0]

    return PredictionResponse(disease=str(prediction))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
