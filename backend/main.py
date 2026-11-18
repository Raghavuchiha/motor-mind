
import os
import pandas as pd

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

from models.model_loader import load_models
from models.predictions import predict_machine
from services.dataset_service import (list_datasets, create_dataset, get_dataset, update_mapping, validate_dataset, predict_dataset)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FLEET_CSV = os.path.join(
    BASE_DIR, "motormind_models", "test_health_scores.csv"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.models = load_models()
    print("MotorMind AI models loaded successfully!")
    yield


app = FastAPI(
    title="MotorMind AI API",
    description="AI-powered Predictive Maintenance System",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MachineInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    machine_type: str = Field(alias="type", pattern="^[LMH]$")
    air_temperature: float = Field(gt=0)
    process_temperature: float = Field(gt=0)
    rotational_speed: int = Field(gt=0)
    torque: float = Field(gt=0)
    tool_wear: int = Field(ge=0)


@app.get("/")
def home():
    return {
        "project": "MotorMind AI",
        "status": "Running",
        "backend": "FastAPI",
    }


@app.get("/api/model-status")
def model_status():
    return {
        "status": "loaded",
        "models": [
            "Failure Prediction",
            "Failure Mode Prediction",
            "Health Scoring",
        ],
    }


@app.post("/api/predict")
def predict(machine: MachineInput):
    if machine.process_temperature <= machine.air_temperature:
        raise HTTPException(
            status_code=422,
            detail="Process temperature must exceed air temperature.",
        )

    try:
        result = predict_machine(machine, app.state.models)
        return {"success": True, "prediction": result}
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}",
        )


@app.get("/api/fleet-overview")
def fleet_overview():
    try:
        if not os.path.exists(FLEET_CSV):
            raise HTTPException(
                status_code=404,
                detail="Fleet dataset was not found.",
            )

        df = pd.read_csv(FLEET_CSV)

        required_columns = ["Health status", "Health score"]
        missing = [
            col for col in required_columns
            if col not in df.columns
        ]

        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"Missing CSV columns: {missing}",
            )

        df["Health status"] = (
            df["Health status"].fillna("Unknown").astype(str)
        )
        df["Health score"] = pd.to_numeric(
            df["Health score"], errors="coerce"
        )

        total = len(df)
        healthy = int((df["Health status"] == "Healthy").sum())
        warning = int((df["Health status"] == "Warning").sum())
        critical = int((df["Health status"] == "Critical").sum())

        average_health = (
            round(float(df["Health score"].mean()), 2)
            if df["Health score"].notna().any()
            else 0.0
        )

        distribution = [
            {"name": "Healthy", "value": healthy},
            {"name": "Warning", "value": warning},
            {"name": "Critical", "value": critical},
        ]

        safe_df = df.astype(object).where(pd.notna(df), None)
        records = safe_df.to_dict(orient="records")

        return {
            "success": True,
            "summary": {
                "total_machines": total,
                "healthy": healthy,
                "warning": warning,
                "critical": critical,
                "average_health": average_health,
            },
            "distribution": distribution,
            "records": records,
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Fleet overview failed: {str(error)}",
        )


@app.get("/api/datasets")
def datasets_list():
    return {"datasets": list_datasets()}


@app.post("/api/datasets/upload")
async def datasets_upload(file: UploadFile = File(...)):
    try:
        raw = await file.read(25 * 1024 * 1024 + 1)
        result = create_dataset(file.filename or "upload.csv", raw)
        return {"success": True, "dataset": result}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Dataset upload failed: {error}")
    finally:
        await file.close()


@app.get("/api/datasets/{dataset_id}")
def dataset_detail(dataset_id: str):
    try:
        return get_dataset(dataset_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.put("/api/datasets/{dataset_id}/mapping")
def dataset_mapping(dataset_id: str, payload: dict):
    try:
        return update_mapping(dataset_id, payload.get("mapping", {}), payload.get("confirm_units", False))
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/datasets/{dataset_id}/validate")
def dataset_validate(dataset_id: str):
    try:
        return validate_dataset(dataset_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/datasets/{dataset_id}/predict")
def dataset_run_prediction(dataset_id: str):
    try:
        return {"success": True, **predict_dataset(dataset_id, app.state.models)}
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Dataset prediction failed: {error}")
