import { useState } from 'react';
import { Upload, FileCode, Loader2, Copy, CheckCircle, AlertCircle, Sparkles, Camera } from 'lucide-react';

export default function DevDebugger() {
  const [errorText, setErrorText] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [contextFile, setContextFile] = useState(null);
  const [framework, setFramework] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [inputMode, setInputMode] = useState('text');

  const API_URL = 'http://127.0.0.1:8000';

  const handleAnalyze = async () => {
    if (!errorText.trim() && !screenshot) {
      alert('Please provide an error message or screenshot');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let projectContext = '';
      
      if (contextFile) {
        const formData = new FormData();
        formData.append('file', contextFile);
        
        const contextResponse = await fetch(`${API_URL}/extract-context`, {
          method: 'POST',
          body: formData,
        });
        
        const contextData = await contextResponse.json();
        projectContext = contextData.context;
        if (!framework && contextData.framework) {
          setFramework(contextData.framework);
        }
      }

      let response;

      if (inputMode === 'text') {
        response = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error_text: errorText,
            project_context: projectContext,
            framework: framework || undefined,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('image', screenshot);
        if (projectContext) formData.append('project_context', projectContext);
        if (framework) formData.append('framework', framework);

        response = await fetch(`${API_URL}/analyze-screenshot`, {
          method: 'POST',
          body: formData,
        });
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      alert('Error analyzing: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
    }
  };

  const handleContextFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setContextFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-12 h-12 text-purple-400" />
            <h1 className="text-5xl font-bold text-white">DevDebugger</h1>
          </div>
          <p className="text-xl text-purple-200">AI-Powered Debugging Assistant</p>
          <p className="text-sm text-purple-300 mt-2">Powered by Google Gemini</p>
        </div>

        <div className="flex gap-4 mb-6 justify-center">
          <button
            onClick={() => setInputMode('text')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              inputMode === 'text'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileCode className="inline w-5 h-5 mr-2" />
            Text Error
          </button>
          <button
            onClick={() => setInputMode('screenshot')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              inputMode === 'screenshot'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Camera className="inline w-5 h-5 mr-2" />
            Screenshot
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-slate-700 mb-8">
          
          {inputMode === 'text' ? (
            <div className="mb-6">
              <label className="block text-purple-300 font-medium mb-3">
                Paste Your Error Message
              </label>
              <textarea
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                placeholder="TypeError: Cannot read property 'map' of undefined..."
                className="w-full h-40 bg-slate-900 text-white rounded-lg p-4 border border-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-purple-300 font-medium mb-3">
                Upload Error Screenshot
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label
                  htmlFor="screenshot-upload"
                  className="flex items-center justify-center w-full h-40 bg-slate-900 rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-500 cursor-pointer transition-colors"
                >
                  {screenshot ? (
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-white">{screenshot.name}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400">Click to upload screenshot</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-purple-300 font-medium mb-3">
              Framework (Optional)
            </label>
            <input
              type="text"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="React, Node.js, Python, etc."
              className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="mb-6">
            <label className="block text-purple-300 font-medium mb-3">
              Project Context (Optional)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".json,.txt"
                onChange={handleContextFileChange}
                className="hidden"
                id="context-upload"
              />
              <label
                htmlFor="context-upload"
                className="flex items-center justify-center w-full h-24 bg-slate-900 rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-500 cursor-pointer transition-colors"
              >
                {contextFile ? (
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                    <p className="text-white text-sm">{contextFile.name}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileCode className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                    <p className="text-slate-400 text-sm">Upload package.json or requirements.txt</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing with Gemini AI...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze Error
              </span>
            )}
          </button>
        </div>

        {result && (
          <div className="space-y-6">
            
            <div className="text-center">
              <span className="inline-block bg-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm">
                ⚡ Analyzed in {result.processing_time}s
              </span>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Error Explanation</h2>
              </div>
              <p className="text-slate-200 leading-relaxed">{result.explanation}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Root Cause</h2>
              </div>
              <p className="text-slate-200 leading-relaxed">{result.root_cause}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Solution</h2>
              </div>
              <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">{result.solution}</div>
            </div>

            {result.code_fix && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">Code Fix</h2>
                  </div>
                  <button
                    onClick={() => handleCopy(result.code_fix)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm">
                  <code>{result.code_fix}</code>
                </pre>
              </div>
            )}

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Prevention Tips</h2>
              </div>
              <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">{result.prevention_tips}</div>
            </div>

          </div>
        )}

        <div className="text-center mt-12 text-slate-400 text-sm">
          <p>Built for TFUG Bhubaneswar Build-a-thon 2025</p>
          <p className="mt-1">Powered by Google Gemini AI</p>
        </div>

      </div>
    </div>
  );
}