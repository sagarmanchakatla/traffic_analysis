import cv2
import time
import subprocess
import psutil
from services.yolo_detector import YOLODetector
from services.traffic_optimizer import TrafficTimingOptimizer

# ---------------- CONFIG ----------------
FRAME_WIDTH = 416  # Reduced from 640 for better performance
FRAME_HEIGHT = 416
DETECTION_INTERVAL = 10  # Increased from 5 seconds
TEMP_THRESHOLD = 75  # °C - reduce processing if exceeded
CPU_THRESHOLD = 80  # % - reduce processing if exceeded
DISPLAY = True
MAX_CAMERA_INDEX = 6
ADAPTIVE_MODE = True  # Enable adaptive processing based on temperature
# ---------------------------------------

class SystemMonitor:
    """Monitor Pi temperature and performance"""
    
    @staticmethod
    def get_cpu_temp():
        """Get CPU temperature in Celsius"""
        try:
            result = subprocess.run(['vcgencmd', 'measure_temp'], 
                                  capture_output=True, text=True, timeout=1)
            temp_str = result.stdout.strip()
            temp = float(temp_str.split('=')[1].split("'")[0])
            return temp
        except:
            return 0.0
    
    @staticmethod
    def get_cpu_usage():
        """Get CPU usage percentage"""
        return psutil.cpu_percent(interval=0.5)
    
    @staticmethod
    def should_throttle(temp, cpu):
        """Determine if we should reduce processing"""
        return temp > TEMP_THRESHOLD or cpu > CPU_THRESHOLD
    
    @staticmethod
    def log_stats(temp, cpu, memory):
        """Print system stats"""
        status = "⚠️  THROTTLING" if SystemMonitor.should_throttle(temp, cpu) else "✓ OK"
        print(f"[SYS] {status} | Temp: {temp:.1f}°C | CPU: {cpu:.1f}% | RAM: {memory:.1f}%")

class TrafficSignalController:
    def __init__(self, detector, optimizer, cameras, lane_config):
        self.detector = detector
        self.optimizer = optimizer
        self.cameras = cameras
        self.lane_config = lane_config
        
        # Current cycle state
        self.current_timings = None
        self.current_priority = []
        self.cycle_start_time = None
        self.current_cycle_duration = 0
        
        # Signal state
        self.current_phase_index = 0
        self.phase_start_time = None
        self.is_running = False
        
        # Performance tracking
        self.detection_count = 0
        self.last_stats_time = time.time()
        self.throttled_mode = False
        
    def capture_snapshots(self):
        """Capture snapshots from all cameras with optimization"""
        snapshots = {}
        
        # If throttled, skip some cameras or use lower quality
        cameras_to_process = self.cameras.items()
        if self.throttled_mode:
            # Process only priority cameras in throttled mode
            print("[THROTTLE] Processing reduced camera set")
            cameras_to_process = list(self.cameras.items())[:2]  # Only first 2 cameras
        
        for lane, cap in cameras_to_process:
            ret, frame = cap.read()
            if ret:
                # Optionally resize further if throttled
                if self.throttled_mode:
                    frame = cv2.resize(frame, (320, 320))
                snapshots[lane] = frame
            else:
                print(f"[WARN] Failed to capture from {lane}")
        
        return snapshots
    
    def detect_and_count(self, snapshots):
        """Run detection on snapshots and get vehicle counts"""
        lane_counts = {}
        annotated_frames = {}
        
        for lane, frame in snapshots.items():
            # Encode frame to bytes
            _, img_bytes = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            detection_start = time.time()
            result = self.detector.detect(img_bytes.tobytes())
            detection_time = time.time() - detection_start
            
            detections = result["detections"]
            
            # Count vehicles by class
            counts = {}
            for det in detections:
                name = det["class_name"]
                counts[name] = counts.get(name, 0) + 1
            
            lane_counts[lane] = counts
            
            # Draw detections for visualization (only if display enabled and not throttled)
            if DISPLAY and not self.throttled_mode:
                annotated = frame.copy()
                for det in detections:
                    x1, y1, x2, y2 = map(int, det["bbox"])
                    label = f"{det['class_name']} {det['confidence']:.2f}"
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(annotated, label, (x1, max(20, y1 - 10)),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                annotated_frames[lane] = annotated
            
            print(f"  [{lane}] Detection: {detection_time:.2f}s - Vehicles: {sum(counts.values())}")
        
        return lane_counts, annotated_frames
    
    def calculate_new_cycle(self):
        """Capture snapshots, detect vehicles, and calculate new cycle timings"""
        print("\n" + "="*70)
        print("CALCULATING NEW CYCLE")
        print("="*70)
        
        # Check system status
        temp = SystemMonitor.get_cpu_temp()
        cpu = SystemMonitor.get_cpu_usage()
        memory = psutil.virtual_memory().percent
        
        SystemMonitor.log_stats(temp, cpu, memory)
        
        # Determine if we should throttle
        if ADAPTIVE_MODE:
            self.throttled_mode = SystemMonitor.should_throttle(temp, cpu)
            if self.throttled_mode:
                print("[MODE] Adaptive throttling ENABLED")
                time.sleep(2)  # Give system time to cool down
        
        # Step 1: Capture snapshots
        snapshot_start = time.time()
        snapshots = self.capture_snapshots()
        print(f"[TIME] Snapshot capture: {time.time() - snapshot_start:.2f}s")
        
        # Step 2: Detect and count vehicles
        detect_start = time.time()
        lane_counts, annotated_frames = self.detect_and_count(snapshots)
        print(f"[TIME] Total detection: {time.time() - detect_start:.2f}s")
        
        # Step 3: Print vehicle counts
        print("\n=== VEHICLE COUNTS ===")
        total_vehicles = 0
        for lane, counts in lane_counts.items():
            lane_total = sum(counts.values())
            total_vehicles += lane_total
            print(f"{lane}: {counts} (Total: {lane_total})")
        print(f"SYSTEM TOTAL: {total_vehicles} vehicles")
        
        # Step 4: Optimize timings
        optimize_start = time.time()
        optimization = self.optimizer.optimize(lane_counts, self.lane_config)
        print(f"[TIME] Optimization: {time.time() - optimize_start:.2f}s")
        
        # Step 5: Update current cycle
        self.current_timings = optimization["timings"]
        self.current_priority = optimization["priority"]
        self.current_cycle_duration = optimization["totalTime"]
        
        # Step 6: Print new timings
        print("\n=== NEW SIGNAL TIMINGS ===")
        for idx, lane in enumerate(self.current_priority, 1):
            timing = self.current_timings[lane]
            print(f"{idx}. {lane}: Green={timing['green']}s, Yellow={timing['yellow']}s")
            if timing['leftGreen'] > 0:
                print(f"   └─ Left: Green={timing['leftGreen']}s, Yellow={timing['leftYellow']}s")
        
        print(f"\nTotal Cycle Duration: {self.current_cycle_duration}s")
        print(f"Next calculation in: {self.current_cycle_duration}s")
        print("="*70 + "\n")
        
        # Display annotated frames
        if DISPLAY and annotated_frames:
            for lane, frame in annotated_frames.items():
                cv2.imshow(f"{lane}_detection", frame)
            cv2.waitKey(1000)  # Show for 1 second
        
        # Reset cycle timing
        self.cycle_start_time = time.time()
        self.current_phase_index = 0
        self.phase_start_time = time.time()
        self.detection_count += 1
        
        return optimization
    
    def get_phase_duration(self, lane_index):
        """Calculate total duration for a lane's phase"""
        if lane_index >= len(self.current_priority):
            return 0
        
        lane = self.current_priority[lane_index]
        timing = self.current_timings[lane]
        
        total = 0
        # Add left turn phase if exists
        if timing['leftGreen'] > 0:
            total += timing['leftGreen'] + timing['leftYellow']
        
        # Add main phase
        total += timing['green'] + timing['yellow']
        
        # Add all-red time
        total += 2
        
        return total
    
    def run_cycle(self):
        """Main control loop for traffic signals"""
        self.is_running = True
        
        print("[INFO] Starting traffic signal controller...")
        print(f"[INFO] Adaptive mode: {ADAPTIVE_MODE}")
        print(f"[INFO] Temperature threshold: {TEMP_THRESHOLD}°C")
        print(f"[INFO] Detection interval: {DETECTION_INTERVAL}s\n")
        
        # Calculate initial cycle
        self.calculate_new_cycle()
        
        frame_count = 0
        while self.is_running:
            current_time = time.time()
            
            # Periodic system stats
            if current_time - self.last_stats_time >= 30:  # Every 30 seconds
                temp = SystemMonitor.get_cpu_temp()
                cpu = SystemMonitor.get_cpu_usage()
                memory = psutil.virtual_memory().percent
                SystemMonitor.log_stats(temp, cpu, memory)
                self.last_stats_time = current_time
            
            # Check if current cycle is complete
            cycle_elapsed = current_time - self.cycle_start_time
            
            if cycle_elapsed >= self.current_cycle_duration:
                # Cycle complete - recalculate
                print(f"\n[CYCLE] Complete! (Duration: {cycle_elapsed:.1f}s)")
                print(f"[STATS] Total detections run: {self.detection_count}")
                self.calculate_new_cycle()
                continue
            
            # Manage phases within current cycle
            phase_elapsed = current_time - self.phase_start_time
            current_phase_duration = self.get_phase_duration(self.current_phase_index)
            
            if phase_elapsed >= current_phase_duration:
                # Move to next phase
                self.current_phase_index += 1
                
                if self.current_phase_index >= len(self.current_priority):
                    print("[WARN] Reached end of phases before cycle completion")
                    self.calculate_new_cycle()
                else:
                    self.phase_start_time = current_time
                    lane = self.current_priority[self.current_phase_index]
                    print(f"\n[PHASE {self.current_phase_index + 1}/{len(self.current_priority)}] "
                          f"Switching to {lane.upper()}")
            
            # Display current status (reduced frequency to save CPU)
            if DISPLAY and frame_count % 3 == 0:  # Update display every 3rd iteration
                for lane, cap in self.cameras.items():
                    ret, frame = cap.read()
                    if ret:
                        # Resize for display to reduce processing
                        display_frame = cv2.resize(frame, (320, 240))
                        
                        # Add status overlay
                        is_active = (self.current_phase_index < len(self.current_priority) and 
                                   lane == self.current_priority[self.current_phase_index])
                        
                        status = "GREEN" if is_active else "RED"
                        color = (0, 255, 0) if is_active else (0, 0, 255)
                        
                        cv2.putText(display_frame, f"{lane.upper()}", 
                                  (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 
                                  0.6, color, 2)
                        cv2.putText(display_frame, status, 
                                  (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                                  0.6, color, 2)
                        
                        # Show time remaining
                        time_remaining = int(self.current_cycle_duration - cycle_elapsed)
                        cv2.putText(display_frame, f"Cycle: {time_remaining}s", 
                                  (10, 75), cv2.FONT_HERSHEY_SIMPLEX, 
                                  0.5, (255, 255, 255), 1)
                        
                        cv2.imshow(f"{lane}_live", display_frame)
            
            frame_count += 1
            
            # Check for exit
            if DISPLAY and cv2.waitKey(100) & 0xFF == ord('q'):
                print("\n[INFO] Exit requested by user")
                self.is_running = False
                break
            
            # Adaptive sleep based on throttling
            sleep_time = 0.2 if self.throttled_mode else 0.1
            time.sleep(sleep_time)
    
    def stop(self):
        """Stop the controller"""
        self.is_running = False
        print("[INFO] Controller stopped")

def discover_cameras(max_index=6):
    """Discover available cameras with optimized settings"""
    cameras = {}
    lane_id = 1
    
    print("[INFO] Scanning for cameras...")
    for idx in range(max_index):
        cap = cv2.VideoCapture(idx, cv2.CAP_V4L2)  # Use V4L2 backend
        if cap.isOpened():
            lane_name = f"lane{lane_id}"
            
            # Optimized settings for Raspberry Pi
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
            cap.set(cv2.CAP_PROP_FPS, 15)  # Limit FPS to reduce load
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer
            
            cameras[lane_name] = cap
            print(f"  ✓ Camera {idx} → {lane_name}")
            lane_id += 1
        else:
            cap.release()
    
    print(f"[INFO] Found {len(cameras)} camera(s)\n")
    return cameras

def main():
    print("\n" + "="*70)
    print("RASPBERRY PI TRAFFIC SIGNAL OPTIMIZATION SYSTEM")
    print("="*70 + "\n")
    
    # Check initial system status
    temp = SystemMonitor.get_cpu_temp()
    cpu = SystemMonitor.get_cpu_usage()
    memory = psutil.virtual_memory().percent
    
    print(f"[SYS] Initial status:")
    SystemMonitor.log_stats(temp, cpu, memory)
    
    if temp > TEMP_THRESHOLD:
        print(f"\n⚠️  WARNING: CPU temperature is high ({temp}°C)")
        print("   Consider adding active cooling or reducing workload")
        print("   Continuing in 5 seconds...\n")
        time.sleep(5)
    
    print("[INFO] Loading YOLO model...")
    model_load_start = time.time()
    detector = YOLODetector("yolov8n.pt")
    print(f"[INFO] Model loaded in {time.time() - model_load_start:.2f}s\n")
    
    optimizer = TrafficTimingOptimizer()
    
    cameras = discover_cameras(MAX_CAMERA_INDEX)
    
    if not cameras:
        print("[ERROR] No cameras detected!")
        print("Please check camera connections and try again.")
        return
    
    # Configure lanes
    lane_config = {
        lane: {"hasLeft": False} for lane in cameras.keys()
    }
    
    # Create and run controller
    controller = TrafficSignalController(detector, optimizer, cameras, lane_config)
    
    try:
        controller.run_cycle()
    except KeyboardInterrupt:
        print("\n[INFO] Interrupted by user")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        controller.stop()
        
        # Cleanup
        print("\n[INFO] Cleaning up...")
        for cap in cameras.values():
            cap.release()
        cv2.destroyAllWindows()
        
        # Final stats
        temp = SystemMonitor.get_cpu_temp()
        print(f"\n[SYS] Final temperature: {temp:.1f}°C")
        print("[INFO] Cleanup complete. Goodbye!\n")

if __name__ == "__main__":
    main()