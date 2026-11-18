
import pandas as pd

FEATURE_COLUMNS = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
    "Temp_diff",
    "Power",
]

MODE_NAMES = ["TWF", "HDF", "PWF", "OSF", "RNF"]


def make_input(machine):
    air = machine.air_temperature
    process = machine.process_temperature
    rpm = machine.rotational_speed
    torque = machine.torque
    wear = machine.tool_wear

    row = {
        "Type": machine.machine_type,
        "Air temperature [K]": air,
        "Process temperature [K]": process,
        "Rotational speed [rpm]": rpm,
        "Torque [Nm]": torque,
        "Tool wear [min]": wear,
        "Temp_diff": process - air,
        "Power": torque * rpm / 9550.0,
    }

    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


def get_underlying_estimator(model):
    if hasattr(model, "named_steps"):
        return model.named_steps["model"]
    return model


def positive_probability(model, X):
    probabilities = model.predict_proba(X)[0]
    underlying = get_underlying_estimator(model)
    classes = list(underlying.classes_)

    if 1 not in classes:
        return 0.0

    return float(probabilities[classes.index(1)])


def predict_machine(machine, models):
    X = make_input(machine)

    failure_probability = positive_probability(
        models["failure"], X
    )

    health_score = 100.0 * (1.0 - failure_probability)

    if health_score >= 80:
        status = "Healthy"
    elif health_score >= 50:
        status = "Warning"
    else:
        status = "Critical"

    mode_model = models["modes"]
    mode_probabilities = mode_model.predict_proba(X)

    failure_modes = {}

    for name, estimator, probabilities in zip(
        MODE_NAMES,
        mode_model.estimators_,
        mode_probabilities,
    ):
        underlying = get_underlying_estimator(estimator)
        classes = list(underlying.classes_)

        if 1 in classes:
            index = classes.index(1)
            probability = float(probabilities[0, index])
        else:
            probability = 0.0

        failure_modes[name] = round(probability * 100, 2)

    return {
        "failure_probability": round(
            failure_probability * 100, 2
        ),
        "health_score": round(health_score, 2),
        "health_status": status,
        "failure_modes": failure_modes,
    }
