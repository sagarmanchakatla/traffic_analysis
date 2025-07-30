from flask import Flask, render_template
from flask_cors import CORS
from flask_socketio import SocketIO
import os


socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config['UPLOAD_FOLDER'] = 'static/uploads'
    app.config['RESULT_FOLDER'] = 'static/results'

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)

    from app.routes.image import image_bp
    from app.routes.video import video_bp
    from app.routes.ws import ws_bp

    app.register_blueprint(image_bp, url_prefix='/api/image')
    app.register_blueprint(video_bp, url_prefix='/api/video')
    app.register_blueprint(ws_bp, url_prefix='/ws')
    
    socketio.init_app(app)

    return app