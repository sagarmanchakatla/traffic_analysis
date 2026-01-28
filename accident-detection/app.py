from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from detection import AccidentDetectionModel
from datetime import datetime
import threading
import time
import os

# -------------------------------------------------
# App Setup
# -------------------------------------------------

app = Flask(__name__)
CORS(app)

print("🚀 Starting Accident Detection Backend")

# -------------------------------------------------
# Load Model
# -------------------------------------------------

model = AccidentDetectionModel("model.json", "model_weights.h5")
font = cv2.FONT_HERSHEY_SIMPLEX

# -------------------------------------------------
# Video Paths Per Lane
# -------------------------------------------------

LANE_VIDEOS = {
    "lane1": "./uploads/test_video.mp4",
    "lane2": "./uploads/video2.mp4",
    "lane3": "./uploads/video2.mp4",
    "lane4": "./uploads/video2.mp4"
}

# Add this mock data or integrate with real emergency services API
EMERGENCY_SERVICES = [
    {
        "name": "City General Hospital",
        "icon": "🏥",
        "distance": "1.2 km away",
        "eta": "3-5 mins"
    },
    {
        "name": "Emergency Ambulance Service",
        "icon": "🚑",
        "distance": "0.8 km away",
        "eta": "2-3 mins"
    },
    {
        "name": "Fire & Rescue",
        "icon": "🚒",
        "distance": "1.5 km away",
        "eta": "4-6 mins"
    },
    {
        "name": "Traffic Police",
        "icon": "🚓",
        "distance": "0.5 km away",
        "eta": "1-2 mins"
    }
]

# -------------------------------------------------
# Global Stores - ADDED EMERGENCY MODE FLAG
# -------------------------------------------------

latest_frames = {}     # lane -> jpeg frame
latest_status = {}     # lane -> {pred, prob}
accident_log = []
emergency_mode = False  # ADDED: Emergency mode flag
emergency_threshold = 98.0  # ADDED: 98% threshold for emergency

# -------------------------------------------------
# Accident Logger - MODIFIED FOR 98% EMERGENCY
# -------------------------------------------------

def log_accident(probability, lane):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Check for emergency (98% or higher)
    is_emergency = probability >= emergency_threshold
    
    # Log all accidents (not just above 80%)
    if not accident_log or \
       (datetime.now() - datetime.strptime(
            accident_log[-1]["timestamp"], "%Y-%m-%d %H:%M:%S"
        )).seconds > 2:

        accident_log.append({
            "timestamp": timestamp,
            "probability": probability,
            "lane": lane,
            "severity": "EMERGENCY" if is_emergency else ("high" if probability > 80 else "medium"),
            "location": "Mumbai Central",
            "emergency": is_emergency  # ADDED: flag for emergency
        })

        if len(accident_log) > 50:
            accident_log.pop(0)

        print(f"🚨 Accident detected on {lane} : {probability}%")
        
        # ACTIVATE EMERGENCY MODE ONLY if 98% or higher
        if is_emergency:
            global emergency_mode
            emergency_mode = True
            print(f"🆘 EMERGENCY MODE ACTIVATED! Lane: {lane}, Confidence: {probability}%")
        else:
            print(f"⚠️  Warning: Accident on {lane} : {probability}% (Below emergency threshold)")

# -------------------------------------------------
# Background Worker Per Lane - MODIFIED FOR EMERGENCY VISUALS
# -------------------------------------------------

def process_lane(lane_id, path):
    print(f"🎥 Opening {lane_id} -> {path}")

    cap = cv2.VideoCapture(path)

    if not cap.isOpened():
        print(f"❌ Cannot open video for {lane_id}")
        return

    print(f"✅ Processing started for {lane_id}")

    while True:

        ret, frame = cap.read()

        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        roi = cv2.resize(rgb, (250, 250))

        pred, prob = model.predict_accident(roi[np.newaxis, :, :])
        
        # IMPORTANT: Get the correct probability value
        # The model returns prediction and probability array
        # We need to get the probability for the predicted class
        if pred == "Accident":
            # Get accident probability (index 0 for accident, index 1 for non-accident)
            # Assuming model returns [accident_prob, non_accident_prob]
            prob_val = float(prob[0][0]) * 100  # Convert to percentage
            prob_val = round(prob_val, 2)
            
            # DEBUG: Print the probability to check
            print(f"DEBUG {lane_id}: Accident prob = {prob_val}%, Raw prob array: {prob[0]}")
            
            # Determine color based on confidence
            if prob_val >= emergency_threshold:  # 98% or higher - EMERGENCY RED
                color = (0, 0, 255)  # Bright red
                text_color = (255, 255, 255)
                log_accident(prob_val, lane_id)
            elif prob_val > 80:  # 81-97% - Warning orange-red
                color = (0, 69, 255)  # Orange-red
                text_color = (255, 255, 255)
                log_accident(prob_val, lane_id)
            elif prob_val > 50:  # 51-80% - Caution orange
                color = (0, 165, 255)  # Orange
                text_color = (255, 255, 255)
                log_accident(prob_val, lane_id)  # Log all accidents
            else:  # Below 50% - Yellow warning
                color = (0, 255, 255)  # Yellow
                text_color = (0, 0, 0)
                log_accident(prob_val, lane_id)
        else:
            # Non-accident probability
            prob_val = float(prob[0][1]) * 100  # Convert to percentage
            prob_val = round(prob_val, 2)
            color = (0, 255, 0)  # Green for no accident
            text_color = (0, 0, 0)

        # EMERGENCY MODE VISUALS - Add flashing red border if emergency mode is active
        # Only show emergency visuals if there's a CURRENT emergency (≥98%)
        if emergency_mode and prob_val >= emergency_threshold:
            # Flash red border every second
            current_time = datetime.now()
            if current_time.second % 2 == 0:  # Even seconds - show border
                cv2.rectangle(frame, (0, 0), (frame.shape[1], frame.shape[0]), (0, 0, 255), 15)
            
            # Add emergency text overlay
            cv2.putText(frame, "EMERGENCY MODE ACTIVE", (frame.shape[1]//2 - 250, 50),
                        font, 1.5, (0, 0, 255), 3)

        # Overlay
        cv2.rectangle(frame, (0,0), (350,40), color, -1)
        
        # Status text with emergency indicator if applicable
        status_text = f"{pred} {prob_val}%"
        if pred == "Accident" and prob_val >= emergency_threshold:
            status_text = f"🚨 {status_text} 🚨"
        
        cv2.putText(frame, status_text, (15,30),
                    font, 1, text_color, 2)

        cv2.putText(frame, lane_id.upper(), (15,70),
                    font, 1, (255,255,255), 2)

        latest_status[lane_id] = {
            "pred": pred,
            "prob": prob_val,
            "emergency": prob_val >= emergency_threshold  # Only true if ≥98%
        }

        _, buffer = cv2.imencode(".jpg", frame)
        latest_frames[lane_id] = buffer.tobytes()

        time.sleep(0.03)   # ~30 FPS

# -------------------------------------------------
# Start All Workers
# -------------------------------------------------

for lane in ["lane1","lane2","lane3","lane4"]:
    threading.Thread(
        target=process_lane,
        args=(lane, LANE_VIDEOS[lane]),
        daemon=True
    ).start()

# -------------------------------------------------
# Video Streaming Endpoint
# -------------------------------------------------

@app.route("/video_feed/<lane>")
def video_feed(lane):

    def gen():
        while True:
            frame = latest_frames.get(lane)

            if frame:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n"
                       + frame + b"\r\n")
            time.sleep(0.03)

    return Response(
        gen(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

# -------------------------------------------------
# APIs - MODIFIED TO INCLUDE EMERGENCY STATUS
# -------------------------------------------------

@app.route("/accident_logs")
def accident_logs():
    # Filter to show only emergency logs (≥98%)
    emergency_logs = [log for log in accident_log if log.get("probability", 0) >= emergency_threshold]
    
    return jsonify({
        "logs": accident_log,
        "emergency_logs": emergency_logs,  # Only ≥98% logs
        "emergency_mode": emergency_mode,  # ADDED
        "threshold": emergency_threshold,   # ADDED
        "emergency_count": len(emergency_logs)  # Count of ≥98% logs
    })

@app.route("/accident_status")
def accident_status():
    latest = accident_log[-1] if accident_log else None
    
    # Check if latest log is an emergency (≥98%)
    latest_is_emergency = False
    if latest and latest.get("probability", 0) >= emergency_threshold:
        latest_is_emergency = True
        latest["emergency_services"] = EMERGENCY_SERVICES
    
    # Count emergency incidents (≥98%)
    emergency_incidents = [log for log in accident_log if log.get("probability", 0) >= emergency_threshold]
    
    return jsonify({
        "lanes": latest_status,
        "latest": latest,
        "emergency_mode": emergency_mode,
        "emergency_count": len(emergency_incidents),
        "threshold": emergency_threshold,
        "latest_is_emergency": latest_is_emergency
    })

@app.route("/clear_logs", methods=["POST"])
def clear_logs():
    global accident_log, emergency_mode
    accident_log.clear()
    emergency_mode = False  # Reset emergency mode when clearing logs
    return jsonify({
        "status": "cleared",
        "emergency_mode": False,
        "message": "All logs cleared and emergency mode reset"
    })

# ADDED: Endpoint to manually reset emergency mode
@app.route("/reset_emergency", methods=["POST"])
def reset_emergency():
    global emergency_mode
    emergency_mode = False
    return jsonify({
        "status": "success",
        "message": "Emergency mode reset",
        "emergency_mode": False
    })

@app.route("/health")
def health():
    # Count logs by severity
    emergency_logs = [log for log in accident_log if log.get("probability", 0) >= emergency_threshold]
    high_logs = [log for log in accident_log if 80 <= log.get("probability", 0) < emergency_threshold]
    medium_logs = [log for log in accident_log if 50 <= log.get("probability", 0) < 80]
    low_logs = [log for log in accident_log if log.get("probability", 0) < 50]
    
    return jsonify({
        "status": "running",
        "lanes_active": list(latest_status.keys()),
        "emergency_mode": emergency_mode,
        "threshold": emergency_threshold,
        "total_logs": len(accident_log),
        "emergency_logs": len(emergency_logs),
        "high_logs": len(high_logs),
        "medium_logs": len(medium_logs),
        "low_logs": len(low_logs),
        "system_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

# -------------------------------------------------
# Run Server
# -------------------------------------------------

if __name__ == "__main__":
    print("✅ Backend running on http://localhost:5002")
    print(f"⚠️  Emergency threshold strictly set to {emergency_threshold}%")
    print("📊 Logging all accidents, but emergency mode only activates at ≥98%")
    app.run(host="0.0.0.0", port=5002, threaded=True)