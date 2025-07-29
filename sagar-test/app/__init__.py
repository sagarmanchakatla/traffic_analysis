from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config['UPLOAD_FOLDER'] = 'static/uploads'
    app.config['RESULT_FOLDER'] = 'static/results'

    from app.routes.image import image_bp
    from app.routes.video import video_bp

    app.register_blueprint(image_bp, url_prefix="/api/image")
    app.register_blueprint(video_bp, url_prefix="/api/video")

    return app
