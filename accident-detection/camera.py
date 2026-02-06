import cv2
from detection import AccidentDetectionModel
import numpy as np
import os

model = AccidentDetectionModel("model.json", 'model_weights.h5')
font = cv2.FONT_HERSHEY_SIMPLEX

def startapplication():
    # Use video file instead of camera
    video_path = 'test_video.mp4'  # Make sure this file exists in the same folder or give full path
    video = cv2.VideoCapture(video_path)

    if not video.isOpened():
        print(f"Error: Cannot open video file {video_path}")
        return

    while True:
        ret, frame = video.read()
        if not ret or frame is None:
            print("End of video or cannot read frame.")
            break  # Exit loop when video ends or frame is invalid

        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        roi = cv2.resize(gray_frame, (250, 250))

        pred, prob = model.predict_accident(roi[np.newaxis, :, :])
        if pred == "Accident":
            prob = round(prob[0][0]*100, 2)
            
            # Optional beep alert
            # if(prob > 90):
            #     os.system("say beep")  # macOS; on Windows you could use winsound.Beep

            cv2.rectangle(frame, (0, 0), (280, 40), (0, 0, 0), -1)
            cv2.putText(frame, f"{pred} {prob}%", (20, 30), font, 1, (255, 255, 0), 2)

        cv2.imshow('Video', frame)
        if cv2.waitKey(33) & 0xFF == ord('q'):
            break

    video.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    startapplication()
