from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
from datetime import datetime
from typing import Optional
from PIL import Image
import io
import google.generativeai as genai
from google.generativeai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
UPLOAD_DIR = "uploads"
ANNOTATIONS_DIR = "annotations"
PREDICTIONS_DIR = "predictions"  # New directory for predictions
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ANNOTATIONS_DIR, exist_ok=True)
os.makedirs(PREDICTIONS_DIR, exist_ok=True)  # Create predictions directory

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Read image file
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        # Save with original filename and dimensions
        filename = file.filename
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # Save the original image
        image.save(filepath, format=image.format)
        
        # Return original image dimensions
        width, height = image.size
        return {
            "filename": filename,
            "width": width,
            "height": height,
            "status": "success"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to upload image: {str(e)}"}
        )

@app.post("/save-annotations")
async def save_annotations(data: dict):
    try:
        # Get the original image filename from the request
        image_filename = data.get('filename')
        if not image_filename:
            # Fallback to timestamp if no filename provided
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"annotations_{timestamp}.json"
        else:
            # Remove .json extension if it exists and add it back
            base_name = os.path.splitext(image_filename)[0]
            filename = f"{base_name}.json"
            
        filepath = os.path.join(ANNOTATIONS_DIR, filename)
        
        # Ensure we store the original image filename in the JSON content
        data_to_save = {
            **data,  # Keep all other data
            "filename": image_filename  # Override filename with original image name
        }
        
        # Save annotations
        with open(filepath, "w") as f:
            json.dump(data_to_save, f, indent=2)
        
        return {"filename": filename, "status": "success"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to save annotations: {str(e)}"}
        )

@app.post("/predict")
async def predict_ui_elements(file: UploadFile = File(...)):
    try:
        # Check if API key is configured
        if not GOOGLE_API_KEY:
            return JSONResponse(
                status_code=500,
                content={"message": "Google API key not configured. Please add your API key to the .env file."}
            )

        # Read image file
        content = await file.read()
        original_image = Image.open(io.BytesIO(content))
        
        # Convert RGBA to RGB if needed
        if original_image.mode == 'RGBA':
            # Create a white background image
            background = Image.new('RGB', original_image.size, (255, 255, 255))
            # Paste the image using alpha channel as mask
            background.paste(original_image, mask=original_image.split()[3])
            original_image = background
        elif original_image.mode != 'RGB':
            original_image = original_image.convert('RGB')
            
        original_width, original_height = original_image.size
            
        try:
            # Create Gemini model
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Prepare prompt for UI element detection
            prompt = """
            Detect the 2d bounding boxes of 4 kinds of UI elements: Button, Input, Dropdown, Radio in UI screenshot, with no more than 20 items. Output a json list where each entry contains the 2D bounding box in "box_2d" and a text label in "label".
            """
            
            print("Sending request to Gemini API...")
            response = model.generate_content(
                contents=[prompt, original_image],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.5,
                    candidate_count=1
                )
            )
            print("Received response from Gemini API")
            print("Raw response:", response.text)
            
            # Check if response has text
            if not response.text:
                return JSONResponse(
                    status_code=500,
                    content={"message": "No response from Gemini API. Please try again."}
                )
            
            # Parse the response and convert coordinates to actual pixels
            try:
                # Clean the response text - remove any markdown formatting if present
                clean_text = response.text
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0]
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1]
                
                print("Cleaned response text:", clean_text)
                predictions = json.loads(clean_text)
                annotations = []
                
                for pred in predictions:
                    # Convert normalized coordinates to actual pixels
                    box = pred["box_2d"]              
                    
                    # Map "Drop" to "Dropdown" if needed
                    element_type = "Dropdown" if pred["label"] == "Drop" else pred["label"]
                    
                    # Convert from 1000x1000 space to actual image dimensions
                    x_min = int(max(0, min((box[0] * original_height) / 1000, original_height)))
                    y_min = int(max(0, min((box[1] * original_width) / 1000, original_width)))
                    x_max = int(max(0, min((box[2] * original_height) / 1000, original_height)))
                    y_max = int(max(0, min((box[3] * original_width) / 1000, original_width)))
                    
                    # Additional validation
                    if x_min >= x_max or y_min >= y_max:
                        print(f"Invalid box dimensions: x_min={x_min}, x_max={x_max}, y_min={y_min}, y_max={y_max}")
                        continue
                    
                    annotation = {
                        "type": element_type,
                        "coordinates": {
                            "x": x_min,
                            "y": y_min,
                            "width": x_max - x_min,
                            "height": y_max - y_min
                        }
                    }
                    annotations.append(annotation)
                
                # Save predictions with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                # Get the input image name without extension
                base_image_name = os.path.splitext(file.filename)[0]
                filename = f"predictions_{base_image_name}.json"
                filepath = os.path.join(PREDICTIONS_DIR, filename)
                
                with open(filepath, "w") as f:
                    json.dump({
                        "filename": file.filename,
                        "predictions": annotations,
                        "timestamp": timestamp,
                        "imageSize": {
                            "width": original_width,
                            "height": original_height
                        }
                    }, f, indent=2)
                
                return {
                    "filename": filename,
                    "predictions": annotations,
                    "status": "success",
                    "imageSize": {
                        "width": original_width,
                        "height": original_height
                    }
                }
                
            except json.JSONDecodeError:
                print("Raw API response:", response.text)  # Log the raw response
                return JSONResponse(
                    status_code=500,
                    content={"message": "Failed to parse API response as JSON. The model might not have returned valid JSON."}
                )
                
        except Exception as api_error:
            print("Gemini API error:", str(api_error))  # Log API-specific error
            return JSONResponse(
                status_code=500,
                content={"message": f"Gemini API error: {str(api_error)}. Please check your API key and billing status."}
            )
            
    except Exception as e:
        print("General error:", str(e))  # Log general error
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to predict UI elements: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 