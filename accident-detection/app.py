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

from flask import Flask, render_template, Response, jsonify
from flask_cors import CORS
import cv2
from detection import AccidentDetectionModel
import numpy as np
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize the model
model = AccidentDetectionModel("model.json", 'model_weights.h5')
font = cv2.FONT_HERSHEY_SIMPLEX

print('script started')
# Global variables
# video_path = r"./uploads/test_video.mp4"
LANE_VIDEOS = {
    "lane1": "./uploads/test_video.mp4",
    "lane2": "./uploads/video2.mp4",
    "lane3": "./uploads/video2.mp4",
    "lane4": "./uploads/video2.mp4",
}

accident_log = []

def generate_frames(lane_id):
    """Generator function to yield video frames"""
    # video = cv2.VideoCapture(video_path)

    video = cv2.VideoCapture(LANE_VIDEOS[lane_id])
    
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
            # Convert numpy float32 to Python float
            prob_val = float(round(prob[0][0] * 100, 2))
            
            # Draw rectangle and text
            cv2.rectangle(frame, (0, 0), (280, 40), (0, 0, 255), -1)
            cv2.putText(frame, f"{pred} {prob_val}%", (20, 30), font, 1, (255, 255, 255), 2)
            
            # Log accident if probability is high
            if prob_val > 80:
                # log_accident(prob_val)
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
    
    video.release()

# def log_accident(probability):
def log_accident(probability, lane_id):

    """Log accident detection with timestamp"""
    global accident_log
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Avoid duplicate logs within 2 seconds
    if not accident_log or (datetime.now() - datetime.strptime(accident_log[-1]['timestamp'], "%Y-%m-%d %H:%M:%S")).seconds > 2:
        # Ensure probability is a Python float, not numpy float32
        accident_log.append({
            'timestamp': timestamp,
            'probability': float(probability),
            'lane': lane_id,
            'location': 'Mumbai Central Junction',
            'severity': 'high'
        })

        # Keep only last 50 logs
        if len(accident_log) > 50:
            accident_log.pop(0)
        
        print(f"Accident logged: {probability}% at {timestamp}")

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/video_feed/<lane_id>')
def video_feed(lane_id):
    return Response(
        generate_frames(lane_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/accident_feed')
def accident_feed():
    """Accident video feed for React component"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/accident_logs')
def get_accident_logs():
    """API endpoint to get accident logs"""
    try:
        # Double-check all values are JSON serializable
        serializable_logs = [
            {
                'timestamp': log['timestamp'],
                'probability': float(log['probability']),
                'severity': log.get('severity', 'medium'),
                'location': log.get('location', 'Unknown')
            }
            for log in accident_log
        ]
        return jsonify({'logs': serializable_logs, 'count': len(serializable_logs)})
    except Exception as e:
        print(f"Error serializing logs: {e}")
        return jsonify({'logs': [], 'count': 0, 'error': str(e)})

@app.route("/accident_status")
def accident_status():
    if not accident_log:
        return jsonify({"accident": False})

    latest = accident_log[-1]
    return jsonify({
        "accident": True,
        "lane": latest["lane"],
        "confidence": latest["probability"],
        "location": latest["location"]
    })

@app.route('/clear_logs', methods=['POST'])
def clear_logs():
    """Clear accident logs"""
    global accident_log
    accident_log = []
    return jsonify({'status': 'success', 'message': 'Logs cleared'})

@app.route('/dispatch_emergency', methods=['POST'])
def dispatch_emergency():
    """Handle emergency service dispatch"""
    try:
        from flask import request
        data = request.json
        
        print(f"Emergency dispatched for accident {data.get('accident_id')}")
        print(f"Location: {data.get('location')}")
        print(f"Services: {data.get('services')}")
        
        # Here you would integrate with actual emergency services API
        # For now, just log and return success
        
        return jsonify({
            'status': 'success',
            'message': 'Emergency services dispatched',
            'accident_id': data.get('accident_id')
        })
    except Exception as e:
        print(f"Error dispatching emergency: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/upload_accident_video', methods=['POST'])
def upload_accident_video():
    """Handle video upload for accident detection"""
    try:
        from flask import request
        
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        location_data = request.form.get('location')
        
        # Save the uploaded video
        upload_path = os.path.join('uploads', video_file.filename)
        os.makedirs('uploads', exist_ok=True)
        video_file.save(upload_path)
        
        # Update global video path
        global video_path
        video_path = upload_path
        
        print(f"Video uploaded: {upload_path}")
        print(f"Location: {location_data}")
        
        return jsonify({
            'status': 'success',
            'message': 'Video uploaded successfully',
            'filename': video_file.filename
        })
    except Exception as e:
        print(f"Error uploading video: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'accidents_logged': len(accident_log)
    })

if __name__ == '__main__':
    print("Starting Accident Detection Server on port 5002...")
    # print(f"Video path: {video_path}")
    app.run(debug=True, threaded=True, host='0.0.0.0', port=5002)