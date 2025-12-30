
export const applyThreshold = (data: Uint8ClampedArray, threshold: number) => {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const val = avg >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
};

export const applyErosion = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  kernelSize: number
): Uint8ClampedArray => {
  const output = new Uint8ClampedArray(data);
  const pad = Math.floor(kernelSize / 2);

  for (let y = pad; y < height - pad; y++) {
    for (let x = pad; x < width - pad; x++) {
      let min = 255;
      for (let ky = -pad; ky <= pad; ky++) {
        for (let kx = -pad; kx <= pad; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          if (data[idx] < min) min = data[idx];
        }
      }
      const outIdx = (y * width + x) * 4;
      output[outIdx] = output[outIdx + 1] = output[outIdx + 2] = min;
    }
  }
  return output;
};

export const applyDilation = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  kernelSize: number
): Uint8ClampedArray => {
  const output = new Uint8ClampedArray(data);
  const pad = Math.floor(kernelSize / 2);

  for (let y = pad; y < height - pad; y++) {
    for (let x = pad; x < width - pad; x++) {
      let max = 0;
      for (let ky = -pad; ky <= pad; ky++) {
        for (let kx = -pad; kx <= pad; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          if (data[idx] > max) max = data[idx];
        }
      }
      const outIdx = (y * width + x) * 4;
      output[outIdx] = output[outIdx + 1] = output[outIdx + 2] = max;
    }
  }
  return output;
};

export const generatePythonCode = (steps: any[], taskId: string) => {
  let code = `import cv2
import numpy as np

# 1. Load the image in grayscale
# Replace 'input_image.png' with your actual file path (e.g., '${taskId}.png')
img = cv2.imread('input_image.png', 0)

if img is None:
    print("Error: Could not load image. Please check the file path.")
else:
    # Initial state
    result = img
`;

  steps.forEach((step, index) => {
    const stepNum = index + 2;
    const kName = `kernel_${index + 1}`;
    
    code += `\n    # Step ${index + 1}: ${step.op}\n`;
    
    switch (step.op) {
      case 'Threshold':
        code += `    _, result = cv2.threshold(result, ${step.threshold}, 255, cv2.THRESH_BINARY)\n`;
        break;
      case 'Erosion':
        code += `    ${kName} = np.ones((${step.kernelSize}, ${step.kernelSize}), np.uint8)\n`;
        code += `    result = cv2.erode(result, ${kName}, iterations=${step.iterations})\n`;
        break;
      case 'Dilation':
        code += `    ${kName} = np.ones((${step.kernelSize}, ${step.kernelSize}), np.uint8)\n`;
        code += `    result = cv2.dilate(result, ${kName}, iterations=${step.iterations})\n`;
        break;
      case 'Opening':
        code += `    ${kName} = np.ones((${step.kernelSize}, ${step.kernelSize}), np.uint8)\n`;
        code += `    result = cv2.morphologyEx(result, cv2.MORPH_OPEN, ${kName})\n`;
        break;
      case 'Closing':
        code += `    ${kName} = np.ones((${step.kernelSize}, ${step.kernelSize}), np.uint8)\n`;
        code += `    result = cv2.morphologyEx(result, cv2.MORPH_CLOSE, ${kName})\n`;
        break;
      case 'Boundary Extraction':
        code += `    ${kName} = np.ones((${step.kernelSize}, ${step.kernelSize}), np.uint8)\n`;
        code += `    eroded = cv2.erode(result, ${kName}, iterations=${step.iterations})\n`;
        code += `    result = cv2.subtract(result, eroded)\n`;
        break;
    }
  });

  code += `
    # Final Step: Save and display result
    cv2.imwrite('${taskId}_output.png', result)
    cv2.imshow('Morphology Result: ${taskId}', result)
    
    print("Process complete. Output saved as ${taskId}_output.png")
    cv2.waitKey(0)
    cv2.destroyAllWindows()
`;
  return code;
};
