
export enum MorphOp {
  EROSION = 'Erosion',
  DILATION = 'Dilation',
  OPENING = 'Opening',
  CLOSING = 'Closing',
  BOUNDARY = 'Boundary Extraction',
  THRESHOLD = 'Threshold'
}

export interface PipelineStep {
  id: string;
  op: MorphOp;
  iterations: number;
  kernelSize: number; // 3, 5, 7...
  threshold?: number; // 0-255
}

export interface LabTask {
  id: string;
  title: string;
  description: string;
  defaultSteps: PipelineStep[];
  imageSource: string;
}
