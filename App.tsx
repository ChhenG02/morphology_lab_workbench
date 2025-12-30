
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LAB_TASKS } from './constants';
import { MorphOp, PipelineStep, LabTask } from './types';
import * as MorphService from './services/morphology';

const App: React.FC = () => {
  const [activeTask, setActiveTask] = useState<LabTask>(LAB_TASKS[0]);
  const [steps, setSteps] = useState<PipelineStep[]>(activeTask.defaultSteps);
  const [sourceImage, setSourceImage] = useState<string>(activeTask.imageSource);
  const [processing, setProcessing] = useState(false);
  const [pythonCode, setPythonCode] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize steps when task changes
  useEffect(() => {
    setSteps(activeTask.defaultSteps);
    setSourceImage(activeTask.imageSource);
  }, [activeTask]);

  const processImage = useCallback(async () => {
    if (!canvasRef.current || !outputCanvasRef.current) return;
    setProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const outCanvas = outputCanvasRef.current;
    const outCtx = outCanvas.getContext('2d');

    if (!ctx || !outCtx) return;

    // Load original image into canvas
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sourceImage;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    outCanvas.width = img.width;
    outCanvas.height = img.height;

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // Apply Pipeline
    for (const step of steps) {
      if (step.op === MorphOp.THRESHOLD) {
        MorphService.applyThreshold(data, step.threshold || 128);
      } else if (step.op === MorphOp.EROSION) {
        for (let i = 0; i < step.iterations; i++) {
          data = MorphService.applyErosion(data, canvas.width, canvas.height, step.kernelSize);
        }
      } else if (step.op === MorphOp.DILATION) {
        for (let i = 0; i < step.iterations; i++) {
          data = MorphService.applyDilation(data, canvas.width, canvas.height, step.kernelSize);
        }
      } else if (step.op === MorphOp.OPENING) {
        data = MorphService.applyErosion(data, canvas.width, canvas.height, step.kernelSize);
        data = MorphService.applyDilation(data, canvas.width, canvas.height, step.kernelSize);
      } else if (step.op === MorphOp.CLOSING) {
        data = MorphService.applyDilation(data, canvas.width, canvas.height, step.kernelSize);
        data = MorphService.applyErosion(data, canvas.width, canvas.height, step.kernelSize);
      } else if (step.op === MorphOp.BOUNDARY) {
        const original = new Uint8ClampedArray(data);
        const eroded = MorphService.applyErosion(data, canvas.width, canvas.height, step.kernelSize);
        for (let i = 0; i < data.length; i += 4) {
          const val = original[i] - eroded[i];
          data[i] = data[i + 1] = data[i + 2] = val;
        }
      }
    }

    const outputImage = new ImageData(data, canvas.width, canvas.height);
    outCtx.putImageData(outputImage, 0, 0);
    setPythonCode(MorphService.generatePythonCode(steps, activeTask.id));
    setProcessing(false);
  }, [sourceImage, steps, activeTask.id]);

  useEffect(() => {
    processImage();
  }, [processImage]);

  const addStep = (op: MorphOp) => {
    const newStep: PipelineStep = {
      id: Math.random().toString(36).substr(2, 9),
      op,
      iterations: 1,
      kernelSize: 3,
      threshold: op === MorphOp.THRESHOLD ? 128 : undefined
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<PipelineStep>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSourceImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-inner">M</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Morphology Lab Workbench</h1>
        </div>
        <div className="flex gap-2">
          {LAB_TASKS.map(task => (
            <button
              key={task.id}
              onClick={() => setActiveTask(task)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTask.id === task.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-2 ring-blue-400' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Task {task.id.slice(-1)}
            </button>
          ))}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar: Pipeline Controls */}
        <aside className="w-80 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-1">{activeTask.title}</h2>
            <p className="text-xs text-gray-400 mb-4 italic leading-relaxed">{activeTask.description}</p>
            
            <label className="block w-full cursor-pointer bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 border-dashed rounded-lg py-3 px-4 text-center text-sm transition-all group">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              <span className="text-blue-400 font-medium group-hover:text-blue-300">Upload Source Image</span>
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Processing Pipeline</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 relative group hover:border-blue-500/50 transition-colors shadow-sm">
                  <button 
                    onClick={() => removeStep(step.id)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/50 w-6 h-6 rounded-full flex items-center justify-center"
                  >
                    &times;
                  </button>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-md shadow-sm">
                      {index + 1}
                    </span>
                    <span className="font-bold text-sm text-gray-200">{step.op}</span>
                  </div>
                  
                  <div className="space-y-4">
                    {step.op === MorphOp.THRESHOLD && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-gray-400 uppercase tracking-tighter">Threshold Value</label>
                          <span className="text-xs font-mono text-blue-400">{step.threshold}</span>
                        </div>
                        <input 
                          type="range" min="0" max="255" value={step.threshold}
                          onChange={(e) => updateStep(step.id, { threshold: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    )}

                    {step.op !== MorphOp.THRESHOLD && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-500 block uppercase font-bold mb-1">Kernel</label>
                          <select 
                            value={step.kernelSize}
                            onChange={(e) => updateStep(step.id, { kernelSize: parseInt(e.target.value) })}
                            className="bg-gray-900 text-xs text-white rounded-lg border border-gray-700 px-2 py-1.5 w-full focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            <option value="3">3x3</option>
                            <option value="5">5x5</option>
                            <option value="7">7x7</option>
                            <option value="9">9x9</option>
                            <option value="11">11x11</option>
                          </select>
                        </div>
                        {step.op !== MorphOp.BOUNDARY && step.op !== MorphOp.OPENING && step.op !== MorphOp.CLOSING && (
                          <div>
                            <label className="text-[10px] text-gray-500 block uppercase font-bold mb-1">Iterations</label>
                            <input 
                              type="number" min="1" max="10" value={step.iterations}
                              onChange={(e) => updateStep(step.id, { iterations: parseInt(e.target.value) || 1 })}
                              className="bg-gray-900 text-xs text-white rounded-lg border border-gray-700 px-2 py-1.5 w-full focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[MorphOp.EROSION, MorphOp.DILATION, MorphOp.OPENING, MorphOp.CLOSING, MorphOp.BOUNDARY, MorphOp.THRESHOLD].map(op => (
                <button
                  key={op}
                  onClick={() => addStep(op)}
                  className="bg-gray-800 hover:bg-blue-600 text-white text-[11px] font-bold py-2 rounded-lg border border-gray-700 transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                >
                  + {op.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Area: Viewports */}
        <section className="flex-1 bg-gray-950 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-fit">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Input Canvas</h3>
              </div>
              <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center relative shadow-inner group">
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain image-rendering-pixelated transition-transform group-hover:scale-[1.02]" />
                <div className="absolute bottom-3 right-3 text-[10px] text-gray-500 bg-gray-900/80 px-2 py-1 rounded">Source</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pipeline Result</h3>
              </div>
              <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-blue-900/20 flex items-center justify-center relative shadow-2xl group">
                {processing && (
                  <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-md flex flex-col items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
                    <span className="text-xs text-blue-400 font-mono tracking-tighter uppercase">Applying Filters...</span>
                  </div>
                )}
                <canvas ref={outputCanvasRef} className="max-w-full max-h-full object-contain image-rendering-pixelated transition-transform group-hover:scale-[1.02]" />
                <div className="absolute bottom-3 right-3 text-[10px] text-blue-500 bg-blue-900/20 px-2 py-1 rounded border border-blue-500/20">Processed</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Python Script for Report</h3>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={() => {
                    const blob = new Blob([pythonCode], {type: 'text/plain'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `morphology_${activeTask.id}.py`;
                    a.click();
                  }}
                  className="text-[10px] font-bold bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter"
                >
                  Download .py
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pythonCode);
                    alert("Copied Python code to clipboard!");
                  }}
                  className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter shadow-md"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
            <div className="bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-gray-800">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                <span className="ml-2 text-[10px] font-mono text-gray-500 uppercase">morphology_{activeTask.id}.py</span>
              </div>
              <div className="p-6 font-mono text-xs overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-gray-700">
                <pre className="text-gray-300">
                  {pythonCode}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl mb-10">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
               <span className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-base">?</span>
               Technical Explanation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-400 text-sm leading-relaxed">
              <div className="space-y-4">
                {activeTask.id === 'task1' && (
                  <div>
                    <h4 className="font-bold text-gray-200 mb-2 uppercase text-xs tracking-widest text-blue-400">Restoration Strategy</h4>
                    <p>Scanned text often suffers from digitization gaps. We apply <strong>Dilation</strong> to expand foreground pixels, effectively filling cracks in strokes. Alternatively, a <strong>Closing</strong> (Dilation then Erosion) preserves the overall font weight while welding disconnected fragments together.</p>
                  </div>
                )}
                {activeTask.id === 'task2' && (
                  <div>
                    <h4 className="font-bold text-gray-200 mb-2 uppercase text-xs tracking-widest text-blue-400">Segmentation Logic</h4>
                    <p>When objects are merged, they typically share a thin "bridge." <strong>Erosion</strong> is used to shrink all objects, causing these thin bridges to disappear first. <strong>Dilation</strong> is then used to restore the primary objects to their original volume, now separated.</p>
                  </div>
                )}
                {activeTask.id === 'task3' && (
                  <div>
                    <h4 className="font-bold text-gray-200 mb-2 uppercase text-xs tracking-widest text-blue-400">Noise Filtering</h4>
                    <p>Fingerprints contain "pores" (holes) and "artifacts" (islands). <strong>Opening</strong> removes external islands by eroding them away. <strong>Closing</strong> fills internal holes by dilating the ridges into the empty spaces. This combination yields a clean structural skeleton.</p>
                  </div>
                )}
                {activeTask.id === 'task4' && (
                  <div>
                    <h4 className="font-bold text-gray-200 mb-2 uppercase text-xs tracking-widest text-blue-400">Boundary Logic</h4>
                    <p>Boundary extraction is a set-theoretic operation: <code>β(A) = A - (A ⊖ B)</code>. By subtracting the eroded version of a shape from its original version, we isolate the outermost shell. This is different from "Edge Detection" which relies on intensity gradients (derivatives).</p>
                  </div>
                )}
                {activeTask.id === 'task5' && (
                  <div>
                    <h4 className="font-bold text-gray-200 mb-2 uppercase text-xs tracking-widest text-blue-400">Custom Pipeline</h4>
                    <p>Experiment with sequential operations. Morphological operations are associative for specific types but generally non-commutative. The order of operations (e.g., Erode then Dilate vs. Dilate then Erode) produces significantly different topological results.</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-950 p-6 rounded-xl border border-gray-800/50 italic space-y-4 relative">
                <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-blue-600 text-[10px] font-bold text-white px-2 py-0.5 rounded shadow">NOTE</div>
                <p>"Morphological operations are defined by the interaction of a shape with a <strong>Structuring Element (SE)</strong>. The SE acts as a probe that determines how pixels are added or removed based on the local neighborhood geometry."</p>
                <p className="text-blue-500/80 not-italic font-bold text-xs uppercase tracking-tighter">Use larger kernels (7x7, 9x9) for more aggressive cleaning of large artifacts.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-3 shrink-0 flex justify-between items-center z-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Computer Vision Lab &copy; 2025</span>
          <div className="h-3 w-[1px] bg-gray-800"></div>
          <span className="text-[10px] text-blue-500/50 font-mono">Status: Ready</span>
        </div>
        <div className="flex gap-4 items-center">
           <div className="flex -space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/50"></div>
              <div className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/50"></div>
              <div className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500/50"></div>
           </div>
           <span className="text-[10px] text-gray-500 font-medium">OpenCV + NumPy + React 19</span>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #020617;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        input[type='range']::-webkit-slider-thumb {
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          appearance: none;
          margin-top: -5px;
        }
      `}</style>
    </div>
  );
};

export default App;
