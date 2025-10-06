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

load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="DevDebugger API", version="1.0.0")

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

# Initialize model - try different model names in order of preference
model = None
model_names_to_try = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
    'models/gemini-1.5-flash',
]

for model_name in model_names_to_try:
    try:
        print(f"Trying to initialize model: {model_name}")
        model = genai.GenerativeModel(model_name)
        # Test the model with a simple prompt
        test_response = model.generate_content("Hello")
        print(f"✓ Successfully initialized model: {model_name}")
        break
    except Exception as e:
        print(f"✗ Failed to initialize {model_name}: {str(e)}")
        continue

if model is None:
    raise RuntimeError("Could not initialize any Gemini model. Please check your API key and available models.")

# Pydantic Models
class ErrorAnalysisRequest(BaseModel):
    error_text: str
    project_context: Optional[str] = None
    framework: Optional[str] = None

class DebugResponse(BaseModel):
    explanation: str
    root_cause: str
    solution: str
    code_fix: Optional[str] = None
    prevention_tips: str
    processing_time: float

# Helper Functions
def create_analysis_prompt(error_text: str, context: str = None, framework: str = None) -> str:
    """Create a structured prompt for Gemini"""
    prompt = f"""You are an expert debugging assistant. Analyze the following error and provide a comprehensive solution.

ERROR MESSAGE:
{error_text}
"""
    if context:
        prompt += f"\nPROJECT CONTEXT:\n{context}\n"
    if framework:
        prompt += f"\nDETECTED FRAMEWORK: {framework}\n"
    prompt += """
INSTRUCTIONS:
Format your response EXACTLY as follows, with each section on a new line:

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
"""
    return prompt

def parse_gemini_response(response_text: str) -> dict:
    """Parse the structured response from Gemini"""
    sections = {
        "explanation": "Could not parse explanation.",
        "root_cause": "Could not parse root cause.",
        "solution": "Could not parse solution.",
        "code_fix": None,
        "prevention_tips": "Could not parse prevention tips."
    }
    
    parts = response_text.split("##")
    for part in parts:
        part = part.strip()
        if part.lower().startswith("error explanation"):
            sections["explanation"] = part.replace("Error Explanation", "", 1).strip()
        elif part.lower().startswith("root cause"):
            sections["root_cause"] = part.replace("Root Cause", "", 1).strip()
        elif part.lower().startswith("solution"):
            sections["solution"] = part.replace("Solution", "", 1).strip()
        elif part.lower().startswith("code fix"):
            code_part = part.replace("Code Fix", "", 1).strip()
            if "```" in code_part:
                try:
                    code_content = code_part.split("```")[1]
                    if '\n' in code_content:
                        sections["code_fix"] = '\n'.join(code_content.split('\n')[1:])
                    else:
                        sections["code_fix"] = code_content
                except IndexError:
                    sections["code_fix"] = "Error parsing code block."
            elif "no code changes needed" not in code_part.lower():
                sections["code_fix"] = code_part
        elif part.lower().startswith("prevention"):
            sections["prevention_tips"] = part.replace("Prevention Tips", "", 1).replace("Prevention", "", 1).strip()
            
    return sections

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "DevDebugger API",
        "version": "1.0.0",
        "status": "operational",
        "model": model._model_name if model else "not initialized"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "gemini_configured": bool(GOOGLE_API_KEY),
        "model_initialized": model is not None,
        "model_name": model._model_name if model else None
    }

@app.get("/list-models")
async def list_models():
    """Debug endpoint to see available models"""
    try:
        models_list = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                models_list.append({
                    "name": m.name,
                    "display_name": m.display_name,
                    "description": m.description
                })
        return {"available_models": models_list, "count": len(models_list)}
    except Exception as e:
        return {"error": str(e)}

@app.post("/analyze", response_model=DebugResponse)
async def analyze_error(request: ErrorAnalysisRequest):
    """Analyze text error with Gemini"""
    import time
    start_time = time.time()
    
    if not model:
        raise HTTPException(status_code=500, detail="Gemini model not initialized")
    
    try:
        prompt = create_analysis_prompt(
            error_text=request.error_text,
            context=request.project_context,
            framework=request.framework
        )
        
        response = model.generate_content(prompt)
        
        if not response or not response.text:
            raise HTTPException(status_code=500, detail="Empty response from Gemini")
        
        parsed = parse_gemini_response(response.text)
        processing_time = time.time() - start_time
        
        return DebugResponse(
            **parsed,
            processing_time=round(processing_time, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing: {str(e)}")

@app.post("/analyze-screenshot")
async def analyze_screenshot(
    image: UploadFile = File(...),
    project_context: Optional[str] = Form(None)
):
    """Analyze error from screenshot using Gemini Vision"""
    import time
    start_time = time.time()
    
    if not model:
        raise HTTPException(status_code=500, detail="Gemini model not initialized")
    
    try:
        # Read and process image
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Create vision prompt
        vision_prompt = """Extract and analyze the error message from this screenshot.

Identify:
1. The exact error message
2. The technology/framework (if visible)
3. The file/line number (if visible)
4. Any relevant stack trace

Then provide analysis in this EXACT format:

## Error Explanation
[Clear explanation]

## Root Cause
[Specific cause]

## Solution
[Numbered steps]

## Code Fix
```
[Code or "No code changes needed"]
```

## Prevention Tips
[Tips to avoid this error]
"""
        
        if project_context:
            vision_prompt += f"\n\nPROJECT CONTEXT:\n{project_context}"
        
        # Gemini 1.5 accepts images directly in the content list
        response = model.generate_content([vision_prompt, pil_image])
        
        if not response or not response.text:
            raise HTTPException(status_code=500, detail="Empty response from Gemini")
        
        parsed = parse_gemini_response(response.text)
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
        error_detail = str(e)
        raise HTTPException(status_code=500, detail=f"Error processing screenshot: {error_detail}")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("DevDebugger API Starting...")
    print(f"Model initialized: {model._model_name if model else 'FAILED'}")
    print("="*50 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000)