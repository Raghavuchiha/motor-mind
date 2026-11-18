# MotorMind AI — React + FastAPI

An AI-assisted predictive-maintenance prototype built around the AI4I 2020 dataset.

## Project structure

- `backend/` — FastAPI API, model loading, prediction logic and CSV dataset profiles.
- `backend/motormind_models/` — the original pretrained model files and AI4I fleet report.
- `frontend/` — React + Vite + Material UI dashboard.
- `backend/storage/` — created automatically for uploaded CSV profiles; not committed with sample user uploads.

## Requirements

- Windows 10/11
- Python 3.11 (recommended; the supplied project models were serialized with scikit-learn 1.9.1)
- Node.js 22+ and npm

## Run the backend (Windows CMD)

```cmd
cd MotorMind_AI_React\backend
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend: `http://127.0.0.1:8000`  
API documentation: `http://127.0.0.1:8000/docs`

## Run the frontend (a second CMD window)

```cmd
cd MotorMind_AI_React\frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Dashboard modules

1. **Fleet Overview** — summary statistics, health distribution, search/filter and CSV export using the included 2,000-row health-score dataset.
2. **Machine Prediction** — single-machine failure probability, health score and failure-mode estimates.
3. **Dataset Manager** — CSV upload, separate dataset profiles, automatic column detection, editable mappings, validation, explicit unit confirmation and batch prediction reports.
4. **Digital Twin** — parameter-driven software representation with AI condition estimates. It is not a physics simulation and does not connect to physical equipment.
5. **What-If Simulator** — compare baseline and proposed machine parameters using the same model.

## Dataset compatibility and limitations

The included pretrained models were trained for the AI4I 2020 schema and domain. The Dataset Manager checks the required fields and refuses model inference when required fields are missing, machine categories are incompatible, numeric values are invalid, or units are not confirmed. The expected units are Kelvin, RPM, Nm and minutes. Generic column names require an explicit user confirmation.

A compatible column layout does **not** prove that another machine population is statistically equivalent to AI4I. Predictions on other datasets are exploratory estimates and need domain validation. A new industrial domain requires suitable labelled data and a separately trained, evaluated and versioned model; this project does not silently retrain or replace the supplied pretrained models.

CSV uploads are limited to 25 MB and 250,000 rows. Batch predictions process up to the first 5,000 rows per request. Uploaded CSVs are stored locally under `backend/storage/datasets`. Only CSV data is accepted; uploaded pickle/joblib model files are not loaded.

The health score is defined as `100 × (1 − predicted failure probability)`. The Healthy/Warning/Critical cutoffs are demo thresholds, not validated maintenance limits. Outputs are decision-support estimates, not safety certification or a substitute for engineering review.

## Troubleshooting

- If model loading fails, use Python 3.11 and install the pinned dependencies in `backend/requirements.txt`.
- Keep the backend and frontend terminals running while using the app.
- If the frontend cannot connect, confirm the backend is available at `http://127.0.0.1:8000`.
- If npm reports dependency issues, remove `frontend/node_modules` and run `npm install` again.
