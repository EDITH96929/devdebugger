'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, FileText, ImageIcon, Sparkles, CheckCircle2, AlertCircle, Copy, Download, Moon, Sun, ChevronDown, ChevronUp, Loader2, X, Clock, Zap } from 'lucide-react'

// Main App Component
export default function DevDebugger() {
  const [darkMode, setDarkMode] = useState(true)
  const [errorInput, setErrorInput] = useState('')
  const [screenshot, setScreenshot] = useState(null) // Holds the File object
  const [screenshotPreview, setScreenshotPreview] = useState(null) // Holds the Data URL for preview
  const [contextFiles, setContextFiles] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    explanation: true,
    root_cause: true,
    solution: true,
    code_fix: true,
    prevention_tips: true,
  })
  const [copiedCode, setCopiedCode] = useState(false)
  const [toast, setToast] = useState(null)
  const fileInputRef = useRef(null)
  const screenshotInputRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setScreenshot(file) // Store the file object for upload
      const reader = new FileReader()
      reader.onload = (event) => {
        setScreenshotPreview(event.target?.result) // Store data URL for preview
      }
      reader.readAsDataURL(file)
      showToast('Screenshot uploaded successfully')
    }
  }

  const handleContextFilesUpload = (e) => {
    const files = Array.from(e.target.files || [])
    setContextFiles(prev => [...prev, ...files])
    showToast(`${files.length} file(s) added`)
  }

  const removeContextFile = (index) => {
    setContextFiles(prev => prev.filter((_, i) => i !== index))
  }
  
  const removeScreenshot = () => {
      setScreenshot(null);
      setScreenshotPreview(null);
  }

  const handleAnalyze = async () => {
    if (!errorInput.trim() && !screenshot) {
      showToast('Please provide an error message or screenshot', 'error')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null); // Clear previous results

    const API_URL = "http://127.0.0.1:8000";
    
    try {
        let response;
        let data;

        if (screenshot) {
            // --- Screenshot Analysis ---
            const formData = new FormData();
            formData.append('image', screenshot);

            // Append context files text content
            let projectContext = "";
            for (const file of contextFiles) {
                projectContext += `\n\n--- File: ${file.name} ---\n${await file.text()}`;
            }
            formData.append('project_context', projectContext);

            response = await fetch(`${API_URL}/analyze-screenshot`, {
                method: 'POST',
                body: formData,
            });

        } else {
            // --- Text Analysis ---
            let projectContext = "";
            for (const file of contextFiles) {
                projectContext += `\n\n--- File: ${file.name} ---\n${await file.text()}`;
            }

            const body = {
                error_text: errorInput,
                project_context: projectContext,
            };

            response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
        }
        
        data = await response.json();

        // Convert backend response to frontend format
        const result = {
            timestamp: new Date().toISOString(),
            explanation: data.explanation,
            root_cause: data.root_cause,
            solution: data.solution,
            code_fix: data.code_fix,
            prevention_tips: data.prevention_tips,
            processing_time: data.processing_time
        }

        setAnalysisResult(result)
        showToast('Analysis complete!')

    } catch (err) {
        console.error("Analysis failed:", err);
        showToast(err.message || 'Failed to fetch analysis.', 'error');
    } finally {
        setIsAnalyzing(false)
    }
  }


  const copyCode = () => {
    if (analysisResult?.code_fix) {
      navigator.clipboard.writeText(analysisResult.code_fix)
      setCopiedCode(true)
      showToast('Code copied to clipboard')
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const downloadSolution = () => {
    if (analysisResult) {
      const content = `
# Debug Analysis Report
Generated: ${new Date(analysisResult.timestamp).toLocaleString()}
Processing Time: ${analysisResult.processing_time}s

## Error Explanation
${analysisResult.explanation}

## Root Cause
${analysisResult.root_cause}

## Solution
${analysisResult.solution}

## Code Fix
\`\`\`
${analysisResult.code_fix || "No code changes needed."}
\`\`\`

## Prevention Tips
${analysisResult.prevention_tips}
      `
      const blob = new Blob([content.trim()], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'debug-solution.md'
      a.click()
      showToast('Solution downloaded')
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // --- Render Method ---
  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      darkMode ? 'bg-black text-gray-300' : 'bg-gray-50 text-gray-800'
    }`}>
        {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border animate-slide-in ${
          darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${
        darkMode ? 'bg-black/80 border-gray-900' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
               <div className="relative">
                 <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-full"></div>
                 <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                   <Zap className="w-6 h-6 text-white" />
                 </div>
               </div>
               <div>
                 <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>DevDebugger</h1>
                 <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                   AI-Powered Debug Assistant
                 </p>
               </div>
            </div>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-all hover:scale-105 ${
                darkMode 
                  ? 'bg-gray-900 hover:bg-gray-800' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-500">Powered by Gemini 1.5 Flash</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent animate-gradient">
            Debug Smarter, Code Faster
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Upload your error, add context, and get AI-powered solutions instantly.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Column */}
          <div className="flex flex-col gap-6">
             {/* Error Input Card */}
             <div className={`rounded-2xl border backdrop-blur-sm transition-all hover:shadow-xl ${
                 darkMode 
                 ? 'bg-gray-900/50 border-gray-800 hover:border-gray-700' 
                 : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
             }`}>
               <div className="p-6">
                 <div className="flex items-center gap-3 mb-4">
                   <div className={`p-2 rounded-lg ${ darkMode ? 'bg-red-500/10' : 'bg-red-50' }`}>
                     <AlertCircle className="w-5 h-5 text-red-500" />
                   </div>
                   <div>
                     <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>Describe Your Error</h3>
                     <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                       Paste error message or upload screenshot
                     </p>
                   </div>
                 </div>
                 
                 <textarea
                   value={errorInput}
                   onChange={(e) => setErrorInput(e.target.value)}
                   placeholder="Paste your error message here... (e.g., TypeError: Cannot read property 'map' of undefined)"
                   className={`w-full h-32 px-4 py-3 rounded-xl border resize-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     darkMode 
                       ? 'bg-black border-gray-800 placeholder-gray-600' 
                       : 'bg-white border-gray-200 placeholder-gray-400'
                   }`}
                 />

                 {/* Screenshot Upload */}
                 <div className="mt-4">
                   <input
                     ref={screenshotInputRef}
                     type="file"
                     accept="image/*"
                     onChange={handleScreenshotUpload}
                     className="hidden"
                   />
                   
                   {screenshotPreview ? (
                     <div className="relative group">
                       <img 
                         src={screenshotPreview} 
                         alt="Error screenshot" 
                         className="w-full h-48 object-cover rounded-xl"
                       />
                       <button
                         onClick={removeScreenshot}
                         className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <X className="w-4 h-4 text-white" />
                       </button>
                     </div>
                   ) : (
                     <button
                       onClick={() => screenshotInputRef.current?.click()}
                       className={`w-full py-4 rounded-xl border-2 border-dashed transition-all hover:scale-[1.02] ${
                         darkMode 
                           ? 'border-gray-800 hover:border-blue-500 hover:bg-blue-500/5' 
                           : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                       }`}
                     >
                       <ImageIcon className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                       <p className="text-sm font-medium">Upload Screenshot</p>
                       <p className={`text-xs mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                         PNG, JPG up to 10MB
                       </p>
                     </button>
                   )}
                 </div>
               </div>
             </div>

             {/* Context Files Card */}
             <div className={`rounded-2xl border backdrop-blur-sm transition-all hover:shadow-xl ${
                 darkMode 
                 ? 'bg-gray-900/50 border-gray-800 hover:border-gray-700' 
                 : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
             }`}>
               <div className="p-6">
                 <div className="flex items-center gap-3 mb-4">
                   <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                     <FileText className="w-5 h-5 text-blue-500" />
                   </div>
                   <div>
                     <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>Add Context Files</h3>
                     <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                       Upload relevant code files for better analysis
                     </p>
                   </div>
                 </div>

                 <input
                   ref={fileInputRef}
                   type="file"
                   multiple
                   onChange={handleContextFilesUpload}
                   className="hidden"
                 />

                 <button
                   onClick={() => fileInputRef.current?.click()}
                   className={`w-full py-4 rounded-xl border-2 border-dashed transition-all hover:scale-[1.02] mb-4 ${
                     darkMode 
                       ? 'border-gray-800 hover:border-blue-500 hover:bg-blue-500/5' 
                       : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                   }`}>
                   <Upload className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                   <p className="text-sm font-medium">Upload Files</p>
                   <p className={`text-xs mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                     .js, .jsx, .ts, .tsx, .py, etc.
                   </p>
                 </button>

                 {contextFiles.length > 0 && (
                   <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                     {contextFiles.map((file, index) => (
                       <div
                         key={index}
                         className={`flex items-center justify-between p-3 rounded-lg ${
                           darkMode ? 'bg-black' : 'bg-white'
                         }`}
                       >
                         <div className="flex items-center gap-3 overflow-hidden">
                           <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                           <span className="text-sm font-medium truncate">{file.name}</span>
                           <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                             {(file.size / 1024).toFixed(1)} KB
                           </span>
                         </div>
                         <button
                           onClick={() => removeContextFile(index)}
                           className="p-1 hover:bg-red-500/10 rounded-full transition-colors"
                         >
                           <X className="w-4 h-4 text-red-500" />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>

             {/* Analyze Button */}
             <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze with AI
                </>
              )}
            </button>
          </div>
          
          {/* Output Column */}
          <div className="flex flex-col gap-6">
                {/* Results Section */}
                {isAnalyzing && (
                     <div className={`rounded-2xl border backdrop-blur-sm p-6 flex flex-col items-center justify-center h-full ${
                        darkMode 
                        ? 'bg-gray-900/50 border-gray-800' 
                        : 'bg-gray-50/50 border-gray-200'
                    }`}>
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>AI is thinking...</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Analyzing your error, please wait.</p>
                    </div>
                )}

                {analysisResult && !isAnalyzing && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Explanation */}
                        <ResultCard title="Error Explanation" icon={<AlertCircle className="w-5 h-5 text-red-500" />} section="explanation" expandedSections={expandedSections} toggleSection={toggleSection}>
                           <p className="text-sm leading-relaxed">{analysisResult.explanation}</p>
                        </ResultCard>

                        {/* Root Cause */}
                        <ResultCard title="Root Cause" icon={<Zap className="w-5 h-5 text-yellow-500" />} section="root_cause" expandedSections={expandedSections} toggleSection={toggleSection}>
                           <p className="text-sm leading-relaxed">{analysisResult.root_cause}</p>
                        </ResultCard>

                        {/* Solution */}
                        <ResultCard title="Recommended Solution" icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} section="solution" expandedSections={expandedSections} toggleSection={toggleSection}>
                           <div className="text-sm leading-relaxed whitespace-pre-wrap">{analysisResult.solution}</div>
                        </ResultCard>
                        
                        {/* Code Fix */}
                        <ResultCard title="Code Fix" icon={<FileText className="w-5 h-5 text-blue-500" />} section="code_fix" expandedSections={expandedSections} toggleSection={toggleSection}
                            actions={
                                <>
                                 <button onClick={copyCode} className={`p-2 rounded-lg transition-all hover:scale-105 ${ darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300' }`}>
                                     {copiedCode ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                 </button>
                                 <button onClick={downloadSolution} className={`p-2 rounded-lg transition-all hover:scale-105 ${ darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300' }`}>
                                     <Download className="w-4 h-4" />
                                 </button>
                                </>
                            }
                        >
                           <pre className={`p-4 rounded-xl overflow-x-auto text-sm leading-relaxed ${ darkMode ? 'bg-black' : 'bg-white'}`}>
                             <code>{analysisResult.code_fix || "No code changes needed."}</code>
                           </pre>
                        </ResultCard>

                         {/* Prevention */}
                        <ResultCard title="Prevention Tips" icon={<Shield className="w-5 h-5 text-purple-500" />} section="prevention_tips" expandedSections={expandedSections} toggleSection={toggleSection}>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{analysisResult.prevention_tips}</div>
                        </ResultCard>
                    </div>
                )}

                {!analysisResult && !isAnalyzing && (
                     <div className={`rounded-2xl border-2 border-dashed backdrop-blur-sm p-6 flex flex-col items-center justify-center h-full ${
                        darkMode 
                        ? 'border-gray-800' 
                        : 'border-gray-300'
                    }`}>
                        <Zap className="w-10 h-10 text-blue-500 mb-4" />
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>Awaiting Analysis</h3>
                        <p className={`text-sm text-center ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Your AI-powered solution will appear here.</p>
                    </div>
                )}
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}

// Reusable Result Card Component
const ResultCard = ({ title, icon, section, expandedSections, toggleSection, actions, children }) => {
    const isExpanded = expandedSections[section];
    const darkMode = document.documentElement.classList.contains('dark');
    
    return (
        <div className={`rounded-2xl border backdrop-blur-sm overflow-hidden ${
          darkMode 
            ? 'bg-gray-900/50 border-gray-800' 
            : 'bg-gray-50/50 border-gray-200'
        }`}>
          <button
            onClick={() => toggleSection(section)}
            className={`w-full p-4 md:p-6 flex items-center justify-between transition-colors ${
              darkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                  darkMode 
                    ? (title.includes("Error") ? 'bg-red-500/10' : title.includes("Solution") ? 'bg-green-500/10' : title.includes("Code") ? 'bg-blue-500/10' : title.includes("Cause") ? 'bg-yellow-500/10' : 'bg-purple-500/10')
                    : (title.includes("Error") ? 'bg-red-50' : title.includes("Solution") ? 'bg-green-50' : title.includes("Code") ? 'bg-blue-50' : title.includes("Cause") ? 'bg-yellow-50' : 'bg-purple-50')
              }`}>
                {icon}
              </div>
              <h3 className={`font-semibold text-left ${darkMode ? 'text-white' : 'text-black'}`}>{title}</h3>
            </div>
            <div className="flex items-center gap-2">
                {actions && isExpanded && <div onClick={e => e.stopPropagation()}>{actions}</div>}
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>
          
          {isExpanded && (
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              {children}
            </div>
          )}
        </div>
    );
};

