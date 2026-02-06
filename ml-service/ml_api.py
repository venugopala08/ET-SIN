# FILE: ml-service/ml_api.py
import pandas as pd
import numpy as np
import pickle
from flask import Flask, request, jsonify

app = Flask(__name__)
CORS(app)

# Load your model
try:
    with open('electricity_theft_detector_xgb.pkl', 'rb') as f:
        model = pickle.load(f)
    print("✅ Model loaded successfully.")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

# This is the list of 13 features your model expects
MODEL_FEATURES = [
    'Consumption', 'Voltage', 'Current', 'Power Factor', 
    'Bill_to_usage_ratio', 'delta_units', 'rolling_avg', 
    'rolling_min', 'rolling_max', 'rolling_std', 
    'interaction_billing_pf', 'month_sin', 'month_cos'
]

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model is not loaded'}), 500

    try:
        data = request.json
        df = pd.DataFrame(data)
        
        # Keep track of original IDs to send back
        original_ids = df['id']

        # Rename database columns (lowercase) to match model features (TitleCase)
        column_mapping = {
            'consumption': 'Consumption',
            'voltage': 'Voltage',
            'current': 'Current',
            'power_factor': 'Power Factor',
            'bill_to_usage_ratio': 'Bill_to_usage_ratio',
            'delta_units': 'delta_units',
            'rolling_avg': 'rolling_avg',
            'rolling_min': 'rolling_min',
            'rolling_max': 'rolling_max',
            'rolling_std': 'rolling_std',
            'interaction_billing_pf': 'interaction_billing_pf',
            'month_sin': 'month_sin',
            'month_cos': 'month_cos'
        }
        
        df_renamed = df.rename(columns=column_mapping)
        
        # Select only the features the model needs, in the correct order
        processed_df = df_renamed[MODEL_FEATURES]
        
        processed_df = processed_df.apply(pd.to_numeric, errors='coerce').fillna(0)

        # Make predictions
        predictions = model.predict(processed_df)
        probabilities = model.predict_proba(processed_df)[:, 1] # Get probability of "theft"

        # Format the response
        results = []
        for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
            
            # --- THIS IS THE 3-LINE FIX ---
            # We must convert the NumPy types to standard Python types
            # The 'int64' error is from the 'id'
            
            result = {
                'id': int(original_ids.iloc[i]), # Cast numpy.int64 to standard int()
                'is_anomaly': bool(pred),        # Cast numpy.bool_ to standard bool()
                'confidence': float(prob)      # Cast numpy.float64 to standard float()
            }
            results.append(result)

        return jsonify(results)

    except KeyError as e:
        print(f"KeyError: {e}")
        return jsonify({'error': f"Column mismatch. Missing: {e}"}), 400
    except Exception as e:
        print(f"Prediction Error: {e}")
        # This will now correctly report the error
        return jsonify({'error': f"An error occurred during prediction: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)