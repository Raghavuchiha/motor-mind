import json
import re
import uuid
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = BASE_DIR / "storage" / "datasets"
META_FILE = BASE_DIR / "storage" / "datasets.json"
MAX_ROWS = 250_000
MAX_COLUMNS = 200
MAX_BYTES = 25 * 1024 * 1024

ALIASES = {
    "type": ["type", "machine type", "machine_type", "machine", "machine category"],
    "air_temperature": ["air temperature [k]", "air temperature", "air_temperature", "air_temp", "airtemp"],
    "process_temperature": ["process temperature [k]", "process temperature", "process_temperature", "process_temp", "processtemp"],
    "rotational_speed": ["rotational speed [rpm]", "rotational speed", "rotational_speed", "rpm", "speed"],
    "torque": ["torque [nm]", "torque", "torque_nm"],
    "tool_wear": ["tool wear [min]", "tool wear", "tool_wear", "wear", "wear_minutes"],
    "failure_target": ["machine failure", "actual failure", "failure", "failure_target", "target", "label"],
}
MODEL_FIELDS = ["type", "air_temperature", "process_temperature", "rotational_speed", "torque", "tool_wear"]
REQUIRED_NUMERIC = ["air_temperature", "process_temperature", "rotational_speed", "torque", "tool_wear"]

def _read_registry():
    if not META_FILE.exists():
        return {}
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}

def _write_registry(data):
    META_FILE.parent.mkdir(parents=True, exist_ok=True)
    META_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")

def _norm(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value).strip().lower()).strip()

def _auto_mapping(columns):
    normalized = {_norm(c): c for c in columns}
    mapping = {}
    confidence = {}
    for field, aliases in ALIASES.items():
        matches = [normalized[_norm(a)] for a in aliases if _norm(a) in normalized]
        if len(set(matches)) == 1:
            mapping[field] = matches[0]
            confidence[field] = "exact_or_alias"
    return mapping, confidence

def _safe_dataset(dataset_id):
    if not re.fullmatch(r"[a-f0-9]{32}", dataset_id or ""):
        raise ValueError("Invalid dataset identifier.")
    registry = _read_registry()
    if dataset_id not in registry:
        raise KeyError("Dataset not found.")
    return registry[dataset_id]

def list_datasets():
    return [{"id": k, **{x: v for x, v in value.items() if x != "path"}}
            for k, value in _read_registry().items()]

def create_dataset(filename, raw):
    if len(raw) > MAX_BYTES:
        raise ValueError("CSV exceeds the 25 MB upload limit.")
    if not filename.lower().endswith(".csv"):
        raise ValueError("Only .csv files are supported.")
    try:
        from io import BytesIO
        df = pd.read_csv(BytesIO(raw), low_memory=False)
    except Exception as exc:
        raise ValueError(f"Could not read CSV: {exc}")
    if df.empty:
        raise ValueError("The uploaded CSV has no data rows.")
    if len(df) > MAX_ROWS or len(df.columns) > MAX_COLUMNS:
        raise ValueError(f"Dataset limit is {MAX_ROWS:,} rows and {MAX_COLUMNS} columns.")
    if df.columns.duplicated().any():
        raise ValueError("Duplicate column names are not supported. Rename them and upload again.")
    if any(str(c).startswith("Unnamed:") for c in df.columns):
        df = df.loc[:, ~df.columns.astype(str).str.startswith("Unnamed:")]
    if len(df.columns) == 0:
        raise ValueError("No usable columns were found.")
    dataset_id = uuid.uuid4().hex
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = STORAGE_DIR / f"{dataset_id}.csv"
    df.to_csv(path, index=False)
    mapping, confidence = _auto_mapping(df.columns)
    item = {
        "filename": Path(filename).name[:160],
        "rows": int(len(df)),
        "columns": [str(c) for c in df.columns],
        "mapping": mapping,
        "mapping_confidence": confidence,
        "created_at": pd.Timestamp.utcnow().isoformat(),
        "path": str(path),
        "validated": False,
    }
    registry = _read_registry()
    registry[dataset_id] = item
    _write_registry(registry)
    return {"id": dataset_id, **{k: v for k, v in item.items() if k != "path"},
            "preview": df.head(8).where(pd.notna(df.head(8)), None).to_dict("records")}

def get_dataset(dataset_id):
    item = _safe_dataset(dataset_id)
    df = pd.read_csv(item["path"], nrows=8)
    return {"id": dataset_id, **{k: v for k, v in item.items() if k != "path"},
            "preview": df.where(pd.notna(df), None).to_dict("records")}

def update_mapping(dataset_id, mapping, confirm_units=False):
    item = _safe_dataset(dataset_id)
    columns = set(item["columns"])
    cleaned = {}
    for field, column in mapping.items():
        if field not in ALIASES:
            raise ValueError(f"Unsupported mapping field: {field}")
        if column in (None, ""):
            continue
        if column not in columns:
            raise ValueError(f"Column '{column}' does not exist in this dataset.")
        cleaned[field] = column
    registry = _read_registry()
    registry[dataset_id]["mapping"] = cleaned
    registry[dataset_id]["mapping_confidence"] = {k: "user_confirmed" for k in cleaned}
    registry[dataset_id]["units_confirmed_by_user"] = bool(confirm_units)
    registry[dataset_id]["validated"] = False
    _write_registry(registry)
    return get_dataset(dataset_id)

def validate_dataset(dataset_id):
    item = _safe_dataset(dataset_id)
    df = pd.read_csv(item["path"])
    mapping = item.get("mapping", {})
    errors, warnings = [], []
    missing = [f for f in MODEL_FIELDS if f not in mapping]
    if missing:
        errors.append("Missing required model inputs: " + ", ".join(missing))
    units_confirmed = True
    manually_confirmed = bool(item.get("units_confirmed_by_user", False))
    # Unit-specific canonical headers are evidence; generic names require explicit user confirmation.
    for field, expected in [("air_temperature", "air temperature [k]"),
                            ("process_temperature", "process temperature [k]"),
                            ("rotational_speed", "rotational speed [rpm]"),
                            ("torque", "torque [nm]"),
                            ("tool_wear", "tool wear [min]")]:
        col = mapping.get(field)
        if col and _norm(col) != _norm(expected):
            if not manually_confirmed:
                units_confirmed = False
                warnings.append(f"Confirm units for '{col}' mapped to {field.replace('_', ' ')} before model use.")
            else:
                warnings.append(f"Units for '{col}' were manually confirmed by the user.")
    numeric_stats = {}
    for field in REQUIRED_NUMERIC:
        col = mapping.get(field)
        if not col:
            continue
        converted = pd.to_numeric(df[col], errors="coerce")
        bad = int(converted.isna().sum())
        if bad:
            errors.append(f"'{col}' contains {bad} missing or non-numeric values.")
        if (converted.dropna() <= 0).any() and field != "tool_wear":
            errors.append(f"'{col}' contains non-positive values.")
        if field == "tool_wear" and (converted.dropna() < 0).any():
            errors.append(f"'{col}' contains negative wear values.")
        numeric_stats[field] = {"min": float(converted.min()) if converted.notna().any() else None,
                                "max": float(converted.max()) if converted.notna().any() else None}
    type_col = mapping.get("type")
    if type_col:
        vals = set(df[type_col].dropna().astype(str).str.strip().str.upper().unique())
        if not vals.issubset({"L", "M", "H"}):
            errors.append("Machine type must use AI4I categories L, M, or H for this pretrained model.")
    target = mapping.get("failure_target")
    if target:
        labels = set(df[target].dropna().unique())
        if not labels.issubset({0, 1, 0.0, 1.0, "0", "1", False, True}):
            warnings.append("Failure target is not binary 0/1; supervised evaluation is unavailable.")
    else:
        warnings.append("No failure label detected. Predictions can be evaluated only against model estimates, not actual outcomes.")
    if not units_confirmed:
        warnings.append("Pretrained AI4I model compatibility is blocked until units are confirmed in canonical units (K, rpm, Nm, minutes).")
    compatible = not errors and units_confirmed and len(missing) == 0
    registry = _read_registry()
    registry[dataset_id]["validated"] = compatible
    registry[dataset_id]["validation"] = {"compatible": compatible, "errors": errors, "warnings": warnings}
    _write_registry(registry)
    return {"dataset_id": dataset_id, "rows": len(df), "columns": len(df.columns),
            "compatible": compatible, "errors": errors, "warnings": warnings,
            "numeric_summary": numeric_stats,
            "model": "AI4I 2020 pretrained model" if compatible else None}

def predict_dataset(dataset_id, models):
    item = _safe_dataset(dataset_id)
    validation = validate_dataset(dataset_id)
    if not validation["compatible"]:
        raise ValueError("Dataset is not compatible with the pretrained AI4I model. Resolve validation errors and confirm units first.")
    df = pd.read_csv(item["path"], nrows=5000)
    mapping = item["mapping"]
    from models.predictions import FEATURE_COLUMNS, MODE_NAMES, get_underlying_estimator
    selected = pd.DataFrame({
        "Type": df[mapping["type"]].astype(str).str.strip().str.upper(),
        "Air temperature [K]": pd.to_numeric(df[mapping["air_temperature"]], errors="coerce"),
        "Process temperature [K]": pd.to_numeric(df[mapping["process_temperature"]], errors="coerce"),
        "Rotational speed [rpm]": pd.to_numeric(df[mapping["rotational_speed"]], errors="coerce"),
        "Torque [Nm]": pd.to_numeric(df[mapping["torque"]], errors="coerce"),
        "Tool wear [min]": pd.to_numeric(df[mapping["tool_wear"]], errors="coerce"),
    })
    valid = selected["Process temperature [K]"] > selected["Air temperature [K]"]
    selected = selected.loc[valid].copy()
    if selected.empty:
        raise ValueError("No rows passed prediction checks (process temperature must exceed air temperature).")
    selected["Temp_diff"] = selected["Process temperature [K]"] - selected["Air temperature [K]"]
    selected["Power"] = selected["Torque [Nm]"] * selected["Rotational speed [rpm]"] / 9550.0
    X = selected[FEATURE_COLUMNS]
    failure_model = models["failure"]
    failure_probs = failure_model.predict_proba(X)
    failure_estimator = get_underlying_estimator(failure_model)
    failure_classes = list(failure_estimator.classes_)
    failure_probability = failure_probs[:, failure_classes.index(1)] if 1 in failure_classes else [0.0] * len(X)
    mode_model = models["modes"]
    mode_probabilities = mode_model.predict_proba(X)
    mode_values = {}
    for name, estimator, probabilities in zip(MODE_NAMES, mode_model.estimators_, mode_probabilities):
        underlying = get_underlying_estimator(estimator)
        classes = list(underlying.classes_)
        mode_values[name] = probabilities[:, classes.index(1)] if 1 in classes else [0.0] * len(X)
    output = []
    for position, (row_index, probability) in enumerate(zip(selected.index, failure_probability)):
        failure_pct = float(probability) * 100.0
        health = 100.0 - failure_pct
        status = "Healthy" if health >= 80 else "Warning" if health >= 50 else "Critical"
        output.append({
            "row": int(row_index) + 1,
            "failure_probability": round(failure_pct, 2),
            "health_score": round(health, 2),
            "health_status": status,
            "failure_modes": {name: round(float(values[position]) * 100.0, 2) for name, values in mode_values.items()},
        })
    return {"dataset_id": dataset_id, "processed_rows": len(output),
            "skipped_rows": int(item["rows"]) - len(output), "results": output,
            "summary": {
                "average_health": round(sum(x["health_score"] for x in output) / len(output), 2),
                "critical": sum(x["health_status"] == "Critical" for x in output),
                "warning": sum(x["health_status"] == "Warning" for x in output),
                "healthy": sum(x["health_status"] == "Healthy" for x in output),
            }}
