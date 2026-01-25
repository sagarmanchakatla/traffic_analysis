from flask import Flask, render_template, Response, jsonify
import cv2
from detection import AccidentDetectionModel
import numpy as np
import os
from datetime import datetime

app = Flask(__name__)

# Initialize the model
model = AccidentDetectionModel("model.json", 'model_weights.h5')
font = cv2.FONT_HERSHEY_SIMPLEX

# Global variables
video_path = '/Volumes/T7/Major_proj/MPR_Traffic/videos/test_video.mp4'
accident_log = []

def generate_frames():
    """Generator function to yield video frames"""
    video = cv2.VideoCapture(video_path)
    
    if not video.isOpened():
        print(f"Error: Cannot open video file {video_path}")
        return
    
    while True:
        ret, frame = video.read()
        if not ret or frame is None:
            # Loop the video
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
        
        # Process frame
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        roi = cv2.resize(gray_frame, (250, 250))
        
        # Predict accident
        pred, prob = model.predict_accident(roi[np.newaxis, :, :])
        
        if pred == "Accident":
            prob_val = round(prob[0][0] * 100, 2)
            
            # Draw rectangle and text
            cv2.rectangle(frame, (0, 0), (280, 40), (0, 0, 255), -1)
            cv2.putText(frame, f"{pred} {prob_val}%", (20, 30), font, 1, (255, 255, 255), 2)
            
            # Log accident if probability is high
            if prob_val > 80:
                log_accident(prob_val)
        else:
            prob_val = round(prob[0][1] * 100, 2)
            cv2.rectangle(frame, (0, 0), (280, 40), (0, 255, 0), -1)
            cv2.putText(frame, f"{pred} {prob_val}%", (20, 30), font, 1, (255, 255, 255), 2)
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    
    video.release()

def log_accident(probability):
    """Log accident detection with timestamp"""
    global accident_log
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Avoid duplicate logs within 2 seconds
    if not accident_log or (datetime.now() - datetime.strptime(accident_log[-1]['timestamp'], "%Y-%m-%d %H:%M:%S")).seconds > 2:
        accident_log.append({
            'timestamp': timestamp,
            'probability': probability
        })
        # Keep only last 50 logs
        if len(accident_log) > 50:
            accident_log.pop(0)

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/accident_logs')
def get_accident_logs():
    """API endpoint to get accident logs"""
    return jsonify(accident_log)

@app.route('/clear_logs', methods=['POST'])
def clear_logs():
    """Clear accident logs"""
    global accident_log
    accident_log = []
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=True, threaded=True, host='0.0.0.0', port=5002)