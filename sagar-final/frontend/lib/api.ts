export interface LaneTiming {
  green: number;
  yellow: number;
  leftGreen?: number;
  leftYellow?: number;
}

export interface CycleResponse {
  timings: {
    [key: string]: LaneTiming;
  };
  vehicleCounts: {
    [key: string]: { [key: string]: number };
  };
  priority: string[];
  totalTime: number;
  annotatedImages: { [key: string]: string }; // Base64 strings
}

export async function calculateCycle(
  images: { [key: string]: File },
  laneConfig?: { [key: string]: { hasLeft: boolean; hasRight: boolean } }
): Promise<CycleResponse> {
  const formData = new FormData();
  formData.append('lane1Image', images.lane1);
  formData.append('lane2Image', images.lane2);
  formData.append('lane3Image', images.lane3);
  formData.append('lane4Image', images.lane4);
  
  if (laneConfig) {
    formData.append('laneConfig', JSON.stringify(laneConfig));
  } else {
    // Default config if not provided
    formData.append('laneConfig', JSON.stringify({
      lane1: { hasLeft: false, hasRight: false },
      lane2: { hasLeft: false, hasRight: false },
      lane3: { hasLeft: false, hasRight: false },
      lane4: { hasLeft: false, hasRight: false },
    }));
  }

  const response = await fetch('http://127.0.0.1:8000/api/calculate-cycle', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to calculate cycle timings');
  }

  return response.json();
}
