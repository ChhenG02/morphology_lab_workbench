
import { LabTask, MorphOp } from './types';

export const LAB_TASKS: LabTask[] = [
  {
    id: 'task1',
    title: 'Task 1: Repair Broken Characters',
    description: 'Restore character continuity for scanned text with broken strokes.',
    imageSource: 'https://picsum.photos/seed/morph1/800/400',
    defaultSteps: [
      { id: 't1s1', op: MorphOp.THRESHOLD, iterations: 1, kernelSize: 3, threshold: 128 },
      { id: 't1s2', op: MorphOp.DILATION, iterations: 1, kernelSize: 3 }
    ]
  },
  {
    id: 'task2',
    title: 'Task 2: Separate Merged Objects',
    description: 'Split connected objects and repair internal breaks.',
    imageSource: 'https://picsum.photos/seed/morph2/800/400',
    defaultSteps: [
      { id: 't2s1', op: MorphOp.THRESHOLD, iterations: 1, kernelSize: 3, threshold: 128 },
      { id: 't2s2', op: MorphOp.OPENING, iterations: 1, kernelSize: 5 },
      { id: 't2s3', op: MorphOp.CLOSING, iterations: 1, kernelSize: 3 }
    ]
  },
  {
    id: 'task3',
    title: 'Task 3: Removing Noise',
    description: 'Remove salt-and-pepper noise and fill holes in fingerprint images.',
    imageSource: 'https://picsum.photos/seed/morph3/800/400',
    defaultSteps: [
      { id: 't3s1', op: MorphOp.THRESHOLD, iterations: 1, kernelSize: 3, threshold: 128 },
      { id: 't3s2', op: MorphOp.OPENING, iterations: 1, kernelSize: 3 },
      { id: 't3s3', op: MorphOp.CLOSING, iterations: 1, kernelSize: 3 }
    ]
  },
  {
    id: 'task4',
    title: 'Task 4: Boundary Extraction',
    description: 'Use morphology to detect object boundaries.',
    imageSource: 'https://picsum.photos/seed/morph4/800/400',
    defaultSteps: [
      { id: 't4s1', op: MorphOp.THRESHOLD, iterations: 1, kernelSize: 3, threshold: 128 },
      { id: 't4s2', op: MorphOp.BOUNDARY, iterations: 1, kernelSize: 3 }
    ]
  },
  {
    id: 'task5',
    title: 'Task 5: Solve Your Own Problem',
    description: 'Custom implementation of morphological operations.',
    imageSource: 'https://picsum.photos/seed/morph5/800/400',
    defaultSteps: [
      { id: 't5s1', op: MorphOp.THRESHOLD, iterations: 1, kernelSize: 3, threshold: 128 }
    ]
  }
];
