from flask import Flask, render_template, Response, jsonify
from flask_cors import CORS
import cv2
from detection import AccidentDetectionModel
import numpy as np
from datetime import datetime
import threading

app = Flask(__name__)
CORS(app)

# Initialize the model
model = AccidentDetectionModel("model.json", 'model_weights.h5')
font = cv2.FONT_HERSHEY_SIMPLEX

print('script started')
# Global variables
video_path = r"./uploads/test_video.mp4"

accident_log = []

def initialize_captures():
    """Initialize video captures for all lanes"""
    for lane, video_path in lane_videos.items():
        try:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                lane_captures[lane] = cap
                print(f"✅ Initialized capture for {lane}: {video_path}")
                print(f"   Frame width: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}, height: {int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")
            else:
                print(f"❌ Failed to open video for {lane}: {video_path}")
        except Exception as e:
            print(f"❌ Error initializing {lane}: {e}")

def generate_frames(lane_id):
    """Generator function to yield video frames for specific lane"""
    if lane_id not in lane_captures:
        print(f"❌ No capture for {lane_id}")
        # Return a black frame as fallback
        while True:
            black_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(black_frame, f"No video for {lane_id}", (50, 240), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            ret, buffer = cv2.imencode('.jpg', black_frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    
    video = lane_captures[lane_id]
    
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
        
        # Add lane label to frame
        cv2.putText(frame, f"Lane: {lane_id[-1]}", (20, 40), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        if pred == "Accident":
            prob_val = float(round(prob[0][0] * 100, 2))
            
            # Draw rectangle and text
            cv2.rectangle(frame, (0, 0), (280, 40), (0, 0, 255), -1)
            cv2.putText(frame, f"{pred} {prob_val}%", (20, 30), font, 1, (255, 255, 255), 2)
            
            # Log accident if probability is high
            if prob_val > 80:
                log_accident(prob_val, lane_id)
        else:
            prob_val = float(round(prob[0][1] * 100, 2))
            cv2.rectangle(frame, (0, 0), (280, 40), (0, 255, 0), -1)
            cv2.putText(frame, f"{pred} {prob_val}%", (20, 30), font, 1, (255, 255, 255), 2)
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

def log_accident(probability, lane_id):
    """Log accident detection with timestamp and lane"""
    global accident_log
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Avoid duplicate logs within 2 seconds
    if not accident_log or (datetime.now() - datetime.strptime(accident_log[-1]['timestamp'], "%Y-%m-%d %H:%M:%S")).seconds > 2:
        accident_log.append({
            'timestamp': timestamp,
            'probability': float(probability),
            'severity': 'high' if probability > 90 else 'medium',
            'location': f'Lane {lane_id[-1]}',
            'lane': lane_id
        })
        
        # Keep only last 50 logs
        if len(accident_log) > 50:
            accident_log.pop(0)
        
        print(f"🚨 Accident logged for {lane_id}: {probability}% at {timestamp}")

# Initialize captures
initialize_captures()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed/<lane_id>')
def video_feed(lane_id):
    """Video streaming route for specific lane"""
    if lane_id not in ['lane1', 'lane2', 'lane3', 'lane4']:
        return "Invalid lane", 404
    
    print(f"📹 Streaming video for {lane_id}")
    return Response(generate_frames(lane_id),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/video_feed')
def default_video_feed():
    """Default video feed (for backward compatibility)"""
    return Response(generate_frames('lane1'),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/accident_logs')
def get_accident_logs():
    try:
        serializable_logs = [
            {
                'timestamp': log['timestamp'],
                'probability': float(log['probability']),
                'severity': log.get('severity', 'medium'),
                'location': log.get('location', 'Unknown'),
                'lane': log.get('lane', 'lane1')
            }
            for log in accident_log
        ]
        return jsonify({'logs': serializable_logs, 'count': len(serializable_logs)})
    except Exception as e:
        print(f"❌ Error serializing logs: {e}")
        return jsonify({'logs': [], 'count': 0, 'error': str(e)})

@app.route('/clear_logs', methods=['POST'])
def clear_logs():
    global accident_log
    accident_log = []
    return jsonify({'status': 'success', 'message': 'Logs cleared'})

@app.route('/lane_info')
def lane_info():
    """Get information about all lanes"""
    info = {}
    for lane_id in ['lane1', 'lane2', 'lane3', 'lane4']:
        if lane_id in lane_captures:
            cap = lane_captures[lane_id]
            info[lane_id] = {
                'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                'fps': cap.get(cv2.CAP_PROP_FPS),
                'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
                'video_path': lane_videos[lane_id]
            }
        else:
            info[lane_id] = {'error': 'Video not loaded'}
    return jsonify(info)

if __name__ == '__main__':
    print("🚀 Starting Accident Detection Server on port 5002...")
    print("📊 Available lanes:")
    for lane in lane_videos.keys():
        print(f"   - {lane}: {lane_videos[lane]}")
    app.run(debug=True, threaded=True, host='0.0.0.0', port=5002)