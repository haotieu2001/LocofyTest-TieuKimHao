"""
Dataset Processing Script for Object Detection

This script processes a directory of images through an object detection API endpoint.
It handles image uploading, tracks processing statistics, and provides a summary
of the processing results including success rates and timing information.

The script supports multiple image formats (jpg, jpeg, png) and includes error
handling for API communication and file processing.
"""

import os
import requests
from pathlib import Path
import time

# Configuration
API_URL = "http://localhost:8000/predict"  # Your FastAPI endpoint
DATASET_DIR = "Datasets"  # Source directory containing images
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}  # Supported image formats

def process_image(image_path):
    """
    Process a single image through the prediction API.
    
    Args:
        image_path (Path): Path object pointing to the image file
        
    Returns:
        dict: API response containing prediction results if successful, None otherwise
        
    Raises:
        requests.exceptions.RequestException: If API request fails
        Exception: For unexpected errors during processing
    """
    try:
        # Open the image file
        with open(image_path, 'rb') as img_file:
            # Create the files payload
            files = {
                'file': (image_path.name, img_file, 'image/jpeg')  # Adjust content-type as needed
            }
            
            # Make the API request
            response = requests.post(API_URL, files=files)
            
            # Check if request was successful
            response.raise_for_status()
            
            print(f"Successfully processed {image_path.name}")
            return response.json()
            
    except requests.exceptions.RequestException as e:
        print(f"Error processing {image_path.name}: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error processing {image_path.name}: {str(e)}")
        return None

def main():
    """
    Main function that orchestrates the dataset processing workflow.
    
    - Validates the dataset directory
    - Processes all supported image files
    - Tracks processing statistics
    - Prints a summary of results
    """
    # Create Path object for dataset directory
    dataset_path = Path(DATASET_DIR)
    
    # Check if directory exists
    if not dataset_path.exists():
        print(f"Error: Directory '{DATASET_DIR}' not found!")
        return
    
    # Counter for processed images
    total_images = 0
    successful_predictions = 0
    
    # Start time
    start_time = time.time()
    
    # Process all images in directory
    for image_path in dataset_path.iterdir():
        # Check if file is an image with supported extension
        if image_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            total_images += 1
            print(f"\nProcessing {image_path.name}...")
            
            result = process_image(image_path)
            if result and result.get('status') == 'success':
                successful_predictions += 1
    
    # Calculate processing time
    processing_time = time.time() - start_time
    
    # Print summary
    print("\n=== Processing Summary ===")
    print(f"Total images processed: {total_images}")
    print(f"Successful predictions: {successful_predictions}")
    print(f"Failed predictions: {total_images - successful_predictions}")
    print(f"Total processing time: {processing_time:.2f} seconds")
    print(f"Average time per image: {processing_time/total_images:.2f} seconds")

if __name__ == "__main__":
    main() 