# from flask import Flask, render_template, Response, jsonify
# import cv2
# from detection import AccidentDetectionModel
# import numpy as np
# import os
# from datetime import datetime

# app = Flask(__name__)

# # Initialize the model
# model = AccidentDetectionModel("model.json", 'model_weights.h5')
# font = cv2.FONT_HERSHEY_SIMPLEX

# # Global variables
# video_path = '/Volumes/T7/Major_proj/MPR_Traffic/videos/test_video.mp4'
# accident_log = []

# def generate_frames():
#     """Generator function to yield video frames"""
#     video = cv2.VideoCapture(video_path)
    
#     if not video.isOpened():
#         print(f"Error: Cannot open video file {video_path}")
#         return
    
#     while True:
#         ret, frame = video.read()
#         if not ret or frame is None:
#             # Loop the video
#             video.set(cv2.CAP_PROP_POS_FRAMES, 0)
#             continue
        
#         # Process frame
#         gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         roi = cv2.resize(gray_frame, (250, 250))
        
#         # Predict accident
#         pred, prob = model.predict_accident(roi[np.newaxis, :, :])
        
#         if pred == "Accident":
#             prob_val = round(prob[0][0] * 100, 2)
            
#             # Draw rectangle and text
#             cv2.rectangle(frame, (0, 0), (280, 40), (0, 0, 255), -1)
#             cv2.putText(frame, f"{pred} {prob_val}%", (20, 30), font, 1, (255, 255, 255), 2)
            
#             # Log accident if probability is high
#             if prob_val > 80:
#                 log_accident(prob_val)
#         else:
#             prob_val = round(prob[0][1] * 100, 2)
#             cv2.rectangle(frame, (0, 0), (280, 40), (0, 255, 0), -1)
#             cv2.putText(frame, f"{pred} {prob_val}%", (20, 30), font, 1, (255, 255, 255), 2)
        
#         # Encode frame as JPEG
#         ret, buffer = cv2.imencode('.jpg', frame)
#         frame = buffer.tobytes()
        
#         yield (b'--frame\r\n'
#                b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    
#     video.release()

# def log_accident(probability):
#     """Log accident detection with timestamp"""
#     global accident_log
#     timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
#     # Avoid duplicate logs within 2 seconds
#     if not accident_log or (datetime.now() - datetime.strptime(accident_log[-1]['timestamp'], "%Y-%m-%d %H:%M:%S")).seconds > 2:
#         accident_log.append({
#             'timestamp': timestamp,
#             'probability': probability
#         })
#         # Keep only last 50 logs
#         if len(accident_log) > 50:
#             accident_log.pop(0)

# @app.route('/')
# def index():
#     """Render the main page"""
#     return render_template('index.html')

# @app.route('/video_feed')
# def video_feed():
#     """Video streaming route"""
#     return Response(generate_frames(),
#                     mimetype='multipart/x-mixed-replace; boundary=frame')

# @app.route('/accident_logs')
# def get_accident_logs():
#     """API endpoint to get accident logs"""
#     return jsonify(accident_log)

# @app.route('/clear_logs', methods=['POST'])
# def clear_logs():
#     """Clear accident logs"""
#     global accident_log
#     accident_log = []
#     return jsonify({'status': 'success'})

# if __name__ == '__main__':
#     app.run(debug=True, threaded=True, host='0.0.0.0', port=5002)

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

# -------------------------------------------------
# Global Stores
# -------------------------------------------------

latest_frames = {}     # lane -> jpeg frame
latest_status = {}     # lane -> {pred, prob}
accident_log = []

# -------------------------------------------------
# Accident Logger
# -------------------------------------------------

def log_accident(probability, lane):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not accident_log or \
       (datetime.now() - datetime.strptime(
            accident_log[-1]["timestamp"], "%Y-%m-%d %H:%M:%S"
        )).seconds > 2:

        accident_log.append({
            "timestamp": timestamp,
            "probability": probability,
            "lane": lane,
            "severity": "high",
            "location": "Mumbai Central"
        })

        if len(accident_log) > 50:
            accident_log.pop(0)

        print(f"🚨 Accident detected on {lane} : {probability}%")

# -------------------------------------------------
# Background Worker Per Lane
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

        if pred == "Accident":
            prob_val = float(round(prob[0][0] * 100, 2))
            color = (0, 0, 255)

            if prob_val > 80:
                log_accident(prob_val, lane_id)
        else:
            prob_val = float(round(prob[0][1] * 100, 2))
            color = (0, 255, 0)

        # Overlay
        cv2.rectangle(frame, (0,0), (300,40), color, -1)
        cv2.putText(frame, f"{pred} {prob_val}%", (15,30),
                    font, 1, (255,255,255), 2)

        cv2.putText(frame, lane_id.upper(), (15,70),
                    font, 1, (255,255,255), 2)

        latest_status[lane_id] = {
            "pred": pred,
            "prob": prob_val
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
# APIs
# -------------------------------------------------

@app.route("/accident_logs")
def accident_logs():
    return jsonify({"logs": accident_log})

@app.route("/accident_status")
def accident_status():
    return jsonify({
        "lanes": latest_status,
        "latest": accident_log[-1] if accident_log else None
    })

@app.route("/clear_logs", methods=["POST"])
def clear_logs():
    accident_log.clear()
    return jsonify({"status": "cleared"})

@app.route("/health")
def health():
    return jsonify({
        "status": "running",
        "lanes_active": list(latest_status.keys())
    })

# -------------------------------------------------
# Run Server
# -------------------------------------------------

if __name__ == "__main__":
    print("✅ Backend running on http://localhost:5002")
    app.run(host="0.0.0.0", port=5002, threaded=True)
