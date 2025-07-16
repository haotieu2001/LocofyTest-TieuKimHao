from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
from datetime import datetime
from typing import Optional
from PIL import Image
import io

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MAX_IMAGE_WIDTH = 1024  # Maximum width for resized images
MAX_IMAGE_HEIGHT = 768  # Maximum height for resized images

# Create directories if they don't exist
UPLOAD_DIR = "uploads"
ANNOTATIONS_DIR = "annotations"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ANNOTATIONS_DIR, exist_ok=True)

def resize_image(image: Image.Image) -> Image.Image:
    """Resize image while maintaining aspect ratio"""
    width, height = image.size
    
    # Calculate aspect ratio
    aspect_ratio = width / height
    
    if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
        if aspect_ratio > 1:  # Width is larger
            new_width = min(width, MAX_IMAGE_WIDTH)
            new_height = int(new_width / aspect_ratio)
        else:  # Height is larger
            new_height = min(height, MAX_IMAGE_HEIGHT)
            new_width = int(new_height * aspect_ratio)
            
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    return image

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Read image file
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        # Resize image
        resized_image = resize_image(image)
        
        # Save with original filename
        filename = file.filename
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # Save the resized image
        resized_image.save(filepath, format=image.format)
        
        # Return image dimensions along with filename
        width, height = resized_image.size
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
        filename = data.get('filename', None)
        if not filename:
            # Fallback to timestamp if no filename provided
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"annotations_{timestamp}.json"
            
        filepath = os.path.join(ANNOTATIONS_DIR, filename)
        
        # Save annotations
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
        
        return {"filename": filename, "status": "success"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to save annotations: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 