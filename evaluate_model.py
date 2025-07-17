"""
Model Evaluation Script for Object Detection

This script evaluates the performance of an object detection model by comparing
its predictions against ground truth annotations. It calculates precision, recall,
and F1-score metrics for each object type (tag).

The script processes JSON files containing bounding box annotations and predictions,
calculating Intersection over Union (IoU) to determine correct detections.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np

class BoundingBox:
    """
    Represents a bounding box with coordinates and dimensions.
    
    Attributes:
        x1 (float): Left coordinate of the box
        y1 (float): Top coordinate of the box
        x2 (float): Right coordinate of the box
        y2 (float): Bottom coordinate of the box
    """
    def __init__(self, x: float, y: float, width: float, height: float):
        self.x1 = x
        self.y1 = y
        self.x2 = x + width
        self.y2 = y + height

def calculate_iou(box1: BoundingBox, box2: BoundingBox) -> float:
    """Calculate Intersection over Union between two bounding boxes"""
    # Calculate intersection coordinates
    x1 = max(box1.x1, box2.x1)
    y1 = max(box1.y1, box2.y1)
    x2 = min(box1.x2, box2.x2)
    y2 = min(box1.y2, box2.y2)
    
    # Calculate intersection area
    if x2 <= x1 or y2 <= y1:
        return 0.0
    intersection = (x2 - x1) * (y2 - y1)
    
    # Calculate union area
    box1_area = (box1.x2 - box1.x1) * (box1.y2 - box1.y1)
    box2_area = (box2.x2 - box2.x1) * (box2.y2 - box2.y1)
    union = box1_area + box2_area - intersection
    
    return intersection / union if union > 0 else 0.0

def load_annotations(file_path: Path) -> List[Tuple[str, BoundingBox]]:
    """Load annotations from a JSON file"""
    with open(file_path) as f:
        data = json.load(f)
    
    boxes = []
    for ann in data['annotations']:
        tag = ann['tag'].lower()
        box = BoundingBox(
            ann['x'],
            ann['y'],
            ann['width'],
            ann['height']
        )
        boxes.append((tag, box))
    return boxes

def load_predictions(file_path: Path) -> List[Tuple[str, BoundingBox]]:
    """Load predictions from a JSON file"""
    with open(file_path) as f:
        data = json.load(f)
    
    boxes = []
    for pred in data['predictions']:
        tag = pred['type'].lower()
        coords = pred['coordinates']
        box = BoundingBox(
            coords['x'],
            coords['y'],
            coords['width'],
            coords['height']
        )
        boxes.append((tag, box))
    return boxes

def calculate_metrics(ground_truth: List[Tuple[str, BoundingBox]], 
                     predictions: List[Tuple[str, BoundingBox]], 
                     iou_threshold: float = 0.5) -> Dict:
    """Calculate precision, recall, and F1-score for each tag"""
    # Initialize counters for each tag
    tag_metrics = {}
    
    # Count ground truth boxes for each tag
    for tag, _ in ground_truth:
        if tag not in tag_metrics:
            tag_metrics[tag] = {
                'total_ground_truth': 0,
                'total_predictions': 0,
                'true_positives': 0
            }
        tag_metrics[tag]['total_ground_truth'] += 1
    
    # Count predictions for each tag
    for tag, _ in predictions:
        if tag not in tag_metrics:
            tag_metrics[tag] = {
                'total_ground_truth': 0,
                'total_predictions': 0,
                'true_positives': 0
            }
        tag_metrics[tag]['total_predictions'] += 1
    
    # For each ground truth box, find the best matching prediction
    used_predictions = set()
    
    for gt_idx, (gt_tag, gt_box) in enumerate(ground_truth):
        best_iou = iou_threshold
        best_pred_idx = None
        
        # Find the best matching prediction for this ground truth box
        for pred_idx, (pred_tag, pred_box) in enumerate(predictions):
            if pred_idx in used_predictions or gt_tag != pred_tag:
                continue
                
            iou = calculate_iou(gt_box, pred_box)
            if iou > best_iou:
                best_iou = iou
                best_pred_idx = pred_idx
        
        # If we found a match, count it as a true positive
        if best_pred_idx is not None:
            used_predictions.add(best_pred_idx)
            tag_metrics[gt_tag]['true_positives'] += 1
    
    # Calculate precision, recall, and F1-score for each tag
    results = {}
    for tag, metrics in tag_metrics.items():
        tp = metrics['true_positives']
        total_gt = metrics['total_ground_truth']
        total_pred = metrics['total_predictions']
        
        precision = tp / total_pred if total_pred > 0 else 0
        recall = tp / total_gt if total_gt > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        results[tag] = {
            'total_ground_truth': total_gt,
            'total_predictions': total_pred,
            'true_positives': tp,
            'precision': precision,
            'recall': recall,
            'f1_score': f1
        }
    
    return results

def main():
    # Paths to the annotation and prediction folders
    annotations_dir = Path("./backend/annotations")
    predictions_dir = Path("./backend/predictions")
    
    # Initialize overall metrics
    overall_metrics = {}
    total_files = 0
    
    # Process each annotation file
    for ann_file in annotations_dir.glob("*.json"):
        # Find corresponding prediction file
        pred_file = predictions_dir / f"predictions_{ann_file.name}"
        if not pred_file.exists():
            print(f"Warning: No prediction file found for {ann_file.name}")
            continue
        
        print(f"\nProcessing {ann_file.name}...")
        
        # Load annotations and predictions
        ground_truth = load_annotations(ann_file)
        predictions = load_predictions(pred_file)
        
        # Calculate metrics for this file
        metrics = calculate_metrics(ground_truth, predictions)
        
        # Accumulate metrics
        for tag, tag_metrics in metrics.items():
            if tag not in overall_metrics:
                overall_metrics[tag] = {
                    'total_ground_truth': 0,
                    'total_predictions': 0,
                    'true_positives': 0
                }
            
            overall_metrics[tag]['total_ground_truth'] += tag_metrics['total_ground_truth']
            overall_metrics[tag]['total_predictions'] += tag_metrics['total_predictions']
            overall_metrics[tag]['true_positives'] += tag_metrics['true_positives']
        
        total_files += 1
    
    # Calculate and print final metrics
    print("\n=== Final Evaluation Results ===")
    print(f"Total files processed: {total_files}\n")
    
    for tag, metrics in overall_metrics.items():
        tp = metrics['true_positives']
        total_gt = metrics['total_ground_truth']
        total_pred = metrics['total_predictions']
        
        precision = tp / total_pred if total_pred > 0 else 0
        recall = tp / total_gt if total_gt > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        print(f"\nMetrics for {tag.upper()}:")
        print(f"  Total ground truth boxes: {total_gt}")
        print(f"  Total predictions: {total_pred}")
        print(f"  True positives (Number of correctly predicted boxes): {tp}")
        print(f"  Precision: {precision:.3f}")
        print(f"  Recall: {recall:.3f}")
        print(f"  F1-score: {f1:.3f}")

if __name__ == "__main__":
    main() 