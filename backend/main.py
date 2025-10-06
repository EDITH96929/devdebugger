from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from typing import Optional
import json
from PIL import Image
import io

load_dotenv()  # Add this line!

# Initialize FastAPI app

app = FastAPI(title="DevDebugger API", version="1.0.0")
# Initialize FastAPI app
app = FastAPI(title="DevDebugger API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set")

genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Gemini model
model = genai.GenerativeModel('gemini-1.5-flash')

# Request models
class ErrorAnalysisRequest(BaseModel):
    error_text: str
    project_context: Optional[str] = None
    framework: Optional[str] = None

# Response model
class DebugResponse(BaseModel):
    explanation: str
    root_cause: str
    solution: str
    code_fix: Optional[str] = None
    prevention_tips: str
    processing_time: float

@app.get("/")
async def root():
    return {
        "message": "DevDebugger API",
        "version": "1.0.0",
        "endpoints": {
            "/analyze": "POST - Analyze error text",
            "/analyze-screenshot": "POST - Analyze error from screenshot",
            "/health": "GET - Health check"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "gemini_configured": bool(GOOGLE_API_KEY)}

def create_analysis_prompt(error_text: str, context: str = None, framework: str = None) -> str:
    """Create a structured prompt for Gemini"""
    
    prompt = f"""You are an expert debugging assistant. Analyze the following error and provide a comprehensive solution.

ERROR MESSAGE:
{error_text}
"""
    
    if context:
        prompt += f"""
PROJECT CONTEXT:
{context}
"""
    
    if framework:
        prompt += f"""
DETECTED FRAMEWORK: {framework}
"""
    
    prompt += """
INSTRUCTIONS:
1. Explain what this error means in simple, clear terms
2. Identify the specific root cause
3. Provide step-by-step solution (be specific and actionable)
4. Include code fixes if applicable (with proper syntax)
5. Suggest preventive measures for the future

Format your response EXACTLY as follows:

## Error Explanation
[Provide clear explanation in 2-3 sentences]

## Root Cause
[Identify the specific cause in 1-2 sentences]

## Solution
[Provide numbered steps, be very specific]

## Code Fix
```[language]
[Provide actual code if applicable, or write "No code changes needed"]
```

## Prevention Tips
[Provide 2-3 actionable tips to avoid this in future]

Be concise but complete. Focus on actionable advice.
"""
    
    return prompt

def parse_gemini_response(response_text: str) -> dict:
    """Parse the structured response from Gemini"""
    
    sections = {
        "explanation": "",
        "root_cause": "",
        "solution": "",
        "code_fix": None,
        "prevention_tips": ""
    }
    
    parts = response_text.split("##")
    
    for part in parts:
        part = part.strip()
        if part.lower().startswith("error explanation"):
            sections["explanation"] = part.replace("Error Explanation", "").strip()
        elif part.lower().startswith("root cause"):
            sections["root_cause"] = part.replace("Root Cause", "").strip()
        elif part.lower().startswith("solution"):
            sections["solution"] = part.replace("Solution", "").strip()
        elif part.lower().startswith("code fix"):
            code_part = part.replace("Code Fix", "").strip()
            if "```" in code_part:
                code_blocks = code_part.split("```")
                if len(code_blocks) >= 2:
                    sections["code_fix"] = code_blocks[1].strip()
            else:
                sections["code_fix"] = code_part if "no code changes needed" not in code_part.lower() else None
        elif part.lower().startswith("prevention"):
            sections["prevention_tips"] = part.replace("Prevention Tips", "").replace("Prevention", "").strip()
    
    return sections

@app.post("/analyze", response_model=DebugResponse)
async def analyze_error(request: ErrorAnalysisRequest):
    """Analyze error text with optional project context"""
    
    import time
    start_time = time.time()
    
    try:
        prompt = create_analysis_prompt(
            error_text=request.error_text,
            context=request.project_context,
            framework=request.framework
        )
        
        response = model.generate_content(prompt)
        response_text = response.text
        
        parsed = parse_gemini_response(response_text)
        
        processing_time = time.time() - start_time
        
        return DebugResponse(
            explanation=parsed["explanation"],
            root_cause=parsed["root_cause"],
            solution=parsed["solution"],
            code_fix=parsed["code_fix"],
            prevention_tips=parsed["prevention_tips"],
            processing_time=round(processing_time, 2)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing: {str(e)}")

@app.post("/analyze-screenshot")
async def analyze_screenshot(
    image: UploadFile = File(...),
    project_context: Optional[str] = Form(None),
    framework: Optional[str] = Form(None)
):
    """Analyze error from screenshot using Gemini Vision"""
    
    import time
    start_time = time.time()
    
    try:
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data))
        
        vision_prompt = """Extract and analyze the error message from this screenshot. 
        
Identify:
1. The exact error message
2. The technology/framework (if visible)
3. The file/line number (if visible)
4. Any relevant stack trace

Then provide the same structured analysis as before:
## Error Explanation
## Root Cause
## Solution
## Code Fix
## Prevention Tips
"""
        
        if project_context:
            vision_prompt += f"\n\nPROJECT CONTEXT:\n{project_context}"
        
        response = model.generate_content([vision_prompt, pil_image])
        response_text = response.text
        
        parsed = parse_gemini_response(response_text)
        
        processing_time = time.time() - start_time
        
        return {
            "explanation": parsed["explanation"],
            "root_cause": parsed["root_cause"],
            "solution": parsed["solution"],
            "code_fix": parsed["code_fix"],
            "prevention_tips": parsed["prevention_tips"],
            "processing_time": round(processing_time, 2),
            "source": "screenshot"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing screenshot: {str(e)}")

@app.post("/extract-context")
async def extract_context(file: UploadFile = File(...)):
    """Extract project context from package.json or requirements.txt"""
    
    try:
        content = await file.read()
        text_content = content.decode('utf-8')
        
        filename = file.filename.lower()
        
        if 'package.json' in filename:
            data = json.loads(text_content)
            dependencies = data.get('dependencies', {})
            dev_dependencies = data.get('devDependencies', {})
            
            context = f"""Framework: Node.js/JavaScript
Dependencies: {', '.join(dependencies.keys())}
Dev Dependencies: {', '.join(dev_dependencies.keys())}
"""
            return {"context": context, "framework": "Node.js/JavaScript"}
            
        elif 'requirements.txt' in filename:
            lines = text_content.strip().split('\n')
            packages = [line.split('==')[0].split('>=')[0].strip() for line in lines if line.strip()]
            
            context = f"""Framework: Python
Packages: {', '.join(packages)}
"""
            return {"context": context, "framework": "Python"}
            
        else:
            return {"context": text_content, "framework": "Unknown"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting context: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)