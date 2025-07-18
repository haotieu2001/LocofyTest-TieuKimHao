import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Rect, Transformer, Text } from 'react-konva';
import axios from 'axios';
import * as React from 'react';

interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tag: string;
}

interface UploadResponse {
  filename: string;
  status: string;
}

interface SaveResponse {
  filename: string;
  status: string;
}

interface PredictResponse {
  filename: string;
  predictions: Array<{
    type: string;
    text: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  }>;
  status: string;
}

const tagColors: { [key: string]: string } = {
  button: '#FF4444',
  input: '#44FF44',
  radio: '#4444FF',
  dropdown: '#FF44FF',
  '': '#FFA500', // Changed from '#FF0000' to '#FFA500' (orange)
};

const ImageAnnotator = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newBoxStart, setNewBoxStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [tempAnnotationId, setTempAnnotationId] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const calculateScale = (imageWidth: number, imageHeight: number) => {
    // Calculate available space (accounting for margins, padding, and panel)
    const availableWidth = window.innerWidth - 500; // 320px panel + margins/padding
    const availableHeight = window.innerHeight - 300; // Account for increased margins/padding
    
    // Calculate scale to fit the image within the available space
    const widthScale = availableWidth / imageWidth;
    const heightScale = availableHeight / imageHeight;
    
    // Use 0.85 as a maximum scale to ensure more padding
    return Math.min(widthScale, heightScale, 0.85);
  };

  const getRelativePointerPosition = (stage: any) => {
    // Get the pointer position relative to the stage
    const transform = stage.getAbsoluteTransform().copy();
    // Invert the transform to get the pointer position in stage's coordinate space
    transform.invert();
    const pos = stage.getPointerPosition();
    return transform.point(pos);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    // Store the filename without extension
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setImageFileName(fileName);

    try {
      const response = await axios.post<UploadResponse>('http://localhost:8000/upload', formData);
      if (response.data.status === 'success') {
        // Load the image
        const img = new window.Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          setImage(img);
          setScale(calculateScale(img.width, img.height));
          setAnnotations([]); // Clear existing annotations for new image
        };
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleMouseDown = (e: any) => {
    if (!image) return;

    // Get the clicked target and its name/type
    const clickedOnEmpty = e.target === e.target.getStage();
    const clickedOnTransformer = e.target.getParent()?.className === 'Transformer';
    
    // If we clicked on transformer or we're trying to select/drag a box, don't create new box
    if (clickedOnTransformer || (!clickedOnEmpty && e.target.className === 'Rect')) {
      return;
    }

    // Clear selection when starting to draw
    setSelectedId(null);
    
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    setIsDrawing(true);
    setNewBoxStart({ x: pos.x, y: pos.y });
    
    // Create a temporary annotation ID
    const tempId = 'temp-' + Date.now().toString();
    setTempAnnotationId(tempId);
    
    // Add initial temporary annotation
    const newAnnotation: Annotation = {
      id: tempId,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      tag: ''
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
  };

  const handleMouseMove = (e: any) => {
    // Only handle mouse move if we're drawing
    if (!isDrawing || !tempAnnotationId) return;

    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    const width = pos.x - newBoxStart.x;
    const height = pos.y - newBoxStart.y;

    // Update the temporary annotation
    setAnnotations(prev => prev.map(ann => 
      ann.id === tempAnnotationId
        ? {
            ...ann,
            width: width,
            height: height
          }
        : ann
    ));
  };

  const handleMouseUp = (e: any) => {
    if (!isDrawing || !tempAnnotationId) return;

    setIsDrawing(false);
    
    // Get the current temporary annotation
    const tempAnnotation = annotations.find(ann => ann.id === tempAnnotationId);
    
    // Only keep the annotation if it has a minimum size (e.g., 5x5 pixels)
    if (tempAnnotation && (Math.abs(tempAnnotation.width) > 5 || Math.abs(tempAnnotation.height) > 5)) {
      // Convert temporary annotation to permanent one
      const permanentId = Date.now().toString();
      setAnnotations(prev => prev.map(ann => 
        ann.id === tempAnnotationId
          ? { ...ann, id: permanentId }
          : ann
      ));
    } else {
      // Remove the temporary annotation if it's too small
      setAnnotations(prev => prev.filter(ann => ann.id !== tempAnnotationId));
    }
    
    setTempAnnotationId(null);
  };

  const handleTagChange = (annotationId: string, newTag: string) => {
    setAnnotations(
      annotations.map(ann =>
        ann.id === annotationId ? { ...ann, tag: newTag } : ann
      )
    );
  };

  const handleSave = async () => {
    if (!imageFileName) {
      alert('Please upload an image first');
      return;
    }

    try {
      // Get the file input element to get the original filename
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const originalFileName = fileInput?.files?.[0]?.name || `${imageFileName}.png`;

      const response = await axios.post<SaveResponse>('http://localhost:8000/save-annotations', {
        filename: originalFileName,  // Send the original image filename
        annotations: annotations.filter(ann => !ann.id.startsWith('temp-')),
        imageWidth: image?.width,
        imageHeight: image?.height,
      });
      
      if (response.data.status === 'success') {
        alert('Annotations saved successfully!');
      }
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations');
    }
  };

  const handleDelete = (idToDelete: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== idToDelete));
    if (selectedId === idToDelete) {
      setSelectedId(null);
    }
  };

  const handlePredict = async () => {
    if (!image || !imageFileName) {
      alert('Please upload an image first');
      return;
    }

    try {
      // Get the file input element
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (!fileInput?.files?.[0]) {
        alert('Please upload an image first');
        return;
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);

      const response = await axios.post<PredictResponse>('http://localhost:8000/predict', formData);
      
      if (response.data.status === 'success') {
        // Convert predictions to annotations format
        const newAnnotations: Annotation[] = response.data.predictions.map((pred: PredictResponse['predictions'][0]) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          x: pred.coordinates.x,
          y: pred.coordinates.y,
          width: pred.coordinates.width,
          height: pred.coordinates.height,
          tag: pred.type.toLowerCase()
        }));

        // Add new predictions to existing annotations
        setAnnotations(prev => [...prev, ...newAnnotations]);
        alert('UI elements detected successfully!');
      }
    } catch (error: any) {
      console.error('Error predicting UI elements:', error);
      
      // Extract the error message from the response if available
      const errorMessage = error.response?.data?.message || error.message || 'Failed to detect UI elements';
      
      // Show a more detailed error message
      alert(`Error: ${errorMessage}\n\nPlease make sure:\n1. Your Google API key is configured correctly\n2. You have enabled billing in Google Cloud\n3. You have sufficient credits/quota`);
    }
  };

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
      }
    }
  }, [selectedId]);

  useEffect(() => {
    // Update scale when window is resized
    const handleResize = () => {
      if (image) {
        setScale(calculateScale(image.width, image.height));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [image]);

  return (
    <div className="image-annotator">
      <div className="controls">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
        <button onClick={handlePredict}>Predict</button>
        <button onClick={handleSave}>Save Annotations</button>
      </div>
      
      <div className="workspace">
        <div className="canvas-container">
          {image ? (
            <Stage
              width={image.width * scale}
              height={image.height * scale}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              ref={stageRef}
              scale={{ x: scale, y: scale }}
            >
              <Layer>
                <Image 
                  image={image}
                  width={image.width}
                  height={image.height}
                />
                {annotations.map((annotation) => (
                  <React.Fragment key={annotation.id}>
                    <Rect
                      id={annotation.id}
                      x={annotation.x}
                      y={annotation.y}
                      width={annotation.width}
                      height={annotation.height}
                      stroke={annotation.id === tempAnnotationId ? "blue" : tagColors[annotation.tag]}
                      strokeWidth={annotation.id === selectedId ? 3 : 2}
                      dash={annotation.id === selectedId ? [5, 5] : undefined}
                      onClick={() => setSelectedId(annotation.id)}
                      onTap={() => setSelectedId(annotation.id)}
                      draggable={annotation.id === selectedId}
                      onDragEnd={(e) => {
                        // Update annotation position after drag
                        setAnnotations(prev => prev.map(ann =>
                          ann.id === annotation.id
                            ? {
                                ...ann,
                                x: e.target.x(),
                                y: e.target.y()
                              }
                            : ann
                        ));
                      }}
                    />
                    {annotation.tag && (
                      <Text
                        x={annotation.x}
                        y={annotation.y - 20}
                        text={annotation.tag}
                        fontSize={16 / scale}
                        fill={tagColors[annotation.tag]}
                      />
                    )}
                  </React.Fragment>
                ))}
                {selectedId && (
                  <Transformer
                    ref={transformerRef}
                    rotateEnabled={false}
                    keepRatio={false}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                    boundBoxFunc={(oldBox, newBox) => {
                      // Ensure minimum size of 5x5
                      const minSize = 5;
                      const isToSmall = newBox.width < minSize || newBox.height < minSize;
                      if (isToSmall) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                    onTransformEnd={(e) => {
                      // Get the node that was transformed
                      const node = e.target;
                      
                      // Get the new position and size
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      
                      // Reset scale to 1 to avoid accumulating scale
                      node.scaleX(1);
                      node.scaleY(1);
                      
                      // Update the annotation with new dimensions
                      setAnnotations(prev => prev.map(ann => 
                        ann.id === selectedId
                          ? {
                              ...ann,
                              x: node.x(),
                              y: node.y(),
                              width: node.width() * scaleX,
                              height: node.height() * scaleY,
                            }
                          : ann
                      ));
                    }}
                  />
                )}
              </Layer>
            </Stage>
          ) : (
            <div className="upload-placeholder">
              Please upload an image to start annotating
            </div>
          )}
        </div>
        
        <div className="annotations-panel">
          <h3>Annotations</h3>
          <div className="annotations-list">
            {annotations
              .filter(ann => !ann.id.startsWith('temp-'))
              .map((ann) => (
                <div 
                  key={ann.id} 
                  className={`annotation-item ${selectedId === ann.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(ann.id)}
                >
                  <select 
                    value={ann.tag} 
                    onChange={(e) => handleTagChange(ann.id, e.target.value)}
                    style={{ borderColor: tagColors[ann.tag] }}
                  >
                    <option value="">Select tag</option>
                    <option value="button">Button</option>
                    <option value="input">Input</option>
                    <option value="radio">Radio</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ann.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnnotator; 