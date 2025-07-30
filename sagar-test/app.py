from app import create_app, socketio
from flask import render_template

app = create_app()

@app.route("/")
def serve_dashboard():
    return render_template("dashboard.html")  # This now looks inside /templates

if __name__ == "__main__":
    socketio.run(app, debug=True)
