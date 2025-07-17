# Locofy Test Project

A full-stack web application for object detection and evaluation, featuring a React/TypeScript frontend and Python backend.

## Project Overview

This project provides a complete solution for:
- Labeling UI components in images
- Predicting UI components in images using LLM API
- Evaluating model predictions against ground truth annotations

## Project Structure

```
├── frontend/           # React/TypeScript frontend
│   ├── src/           # Source code
│   ├── public/        # Static files
│   └── package.json   # Frontend dependencies
├── backend/           # Python backend
│   ├── main.py       # Main server file
│   ├── uploads/      # Upload directory
│   └── annotations/  # Annotations directory
│   └── predictions/  # Predictions directory
├── evaluate_model.py  # Model evaluation script
├── process_datasets.py # Dataset processing script
└── Datasets/         # Directory for input images
```

## Key Features

- **Image Processing**: Supports multiple image formats (JPG, JPEG, PNG)
- **Object Detection**: API endpoint for processing images and returning predictions
- **Evaluation Metrics**: Calculates precision, recall, and F1-score for each object type
- **Interactive UI**: Modern web interface for uploading images and viewing results

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm (v8 or higher)
- Python (v3.8 or higher)
- pip (Python package manager)

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### Start the Backend Server

1. Make sure you're in the backend directory and the virtual environment is activated
2. Run the Python server:
   ```bash
   python main.py
   ```
   The backend server will start running on `http://localhost:5000`

### Start the Frontend Development Server

1. Open a new terminal
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## Using the Scripts

### Dataset Processing (process_datasets.py)

This script processes a directory of images through the object detection API:
```bash
python process_datasets.py
```
- Process all images in the `Datasets` directory through the object detection API and save the predictions to the predictions directory

### Model Evaluation (evaluate_model.py)

This script evaluates model predictions against ground truth annotations:
```bash
python evaluate_model.py
```
- Compares prediction JSON files with ground truth annotations JSON files 
- Calculates IoU (Intersection over Union) for matching
- Generates detailed metrics per object type

## Sample Evaluation Results

Example output from evaluating the model on a test dataset:

```
=== Final Evaluation Results ===
Total files processed: 20

Metrics for DROPDOWN:
  Total ground truth boxes: 34
  Total predictions: 35
  True positives (Number of correctly predicted boxes): 1
  Precision: 0.029
  Recall: 0.029
  F1-score: 0.029

Metrics for BUTTON:
  Total ground truth boxes: 48
  Total predictions: 122
  True positives (Number of correctly predicted boxes): 5
  Precision: 0.041
  Recall: 0.104
  F1-score: 0.059

Metrics for RADIO:
  Total ground truth boxes: 14
  Total predictions: 19
  True positives (Number of correctly predicted boxes): 1
  Precision: 0.053
  Recall: 0.071
  F1-score: 0.061

Metrics for INPUT:
  Total ground truth boxes: 10
  Total predictions: 20
  True positives (Number of correctly predicted boxes): 1
  Precision: 0.050
  Recall: 0.100
  F1-score: 0.067
```

These results indicate areas where the model could be improved:
- High number of false positives (especially for BUTTON components)
- Low true positive rate across all component types
- Room for improvement in both precision and recall metrics

## License

This project is licensed under the MIT License - see the LICENSE file for details 