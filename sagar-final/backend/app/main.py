from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any
import uvicorn
import asyncio

from app.services.yolo_detector import YOLODetector
from app.services.traffic_optimizer import TrafficTimingOptimizer

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
# We initialize YOLO lazily or on startup to avoid long import times during dev if not needed immediately
# But for simplicity here, we'll init on startup
detector = None
optimizer = TrafficTimingOptimizer()

@app.on_event("startup")
async def startup_event():
    global detector
    try:
        detector = YOLODetector()
    except Exception as e:
        print(f"Failed to load YOLO model: {e}")

class LaneTimings(BaseModel):
    green: int
    yellow: int
    leftGreen: int = 0
    leftYellow: int = 0

class CycleResponse(BaseModel):
    timings: Dict[str, LaneTimings]
    vehicleCounts: Dict[str, Dict[str, int]]
    priority: List[str]
    totalTime: int
    annotatedImages: Dict[str, str] # Base64 images

@app.post("/api/calculate-cycle", response_model=CycleResponse)
async def calculate_cycle(
    lane1Image: UploadFile = File(...),
    lane2Image: UploadFile = File(...),
    lane3Image: UploadFile = File(...),
    lane4Image: UploadFile = File(...),
    laneConfig: str = Form(...) # JSON string
):
    if detector is None:
        raise HTTPException(status_code=500, detail="YOLO model not initialized")

    try:
        import json
        config = json.loads(laneConfig)
        
        images_map = {
            "lane1": await lane1Image.read(),
            "lane2": await lane2Image.read(),
            "lane3": await lane3Image.read(),
            "lane4": await lane4Image.read()
        }
        
        # 1. Detect vehicles and get counts per class
        lane_counts = {}
        annotated_images = {}
        
        for lane, img_bytes in images_map.items():
            result = detector.get_vehicle_counts(img_bytes)
            lane_counts[lane] = result["counts"]
            annotated_images[lane] = result["annotated_image"] or ""
            
        # 2. Optimize timings and priority
        optimization_result = optimizer.optimize(lane_counts, config)
        
        return {
            "timings": optimization_result["timings"],
            "vehicleCounts": lane_counts,
            "priority": optimization_result["priority"],
            "totalTime": optimization_result["totalTime"],
            "annotatedImages": annotated_images
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
