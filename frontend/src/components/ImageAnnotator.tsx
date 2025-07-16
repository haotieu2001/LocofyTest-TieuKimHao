import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Rect, Transformer, Text } from 'react-konva';
import axios from 'axios';
import React from 'react'; // Added missing import for React.Fragment

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

const tagColors: { [key: string]: string } = {
  button: '#FF4444',
  input: '#44FF44',
  radio: '#4444FF',
  dropdown: '#FF44FF',
  '': '#FF0000',
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

  const handleMouseUp = () => {
    if (!isDrawing || !tempAnnotationId) return;

    setIsDrawing(false);
    
    // Convert temporary annotation to permanent one
    const permanentId = Date.now().toString();
    setAnnotations(prev => prev.map(ann => 
      ann.id === tempAnnotationId
        ? { ...ann, id: permanentId }
        : ann
    ));
    
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
      const response = await axios.post<SaveResponse>('http://localhost:8000/save-annotations', {
        filename: `${imageFileName}.json`,
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
                      strokeWidth={2}
                      onClick={() => setSelectedId(annotation.id)}
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
                    boundBoxFunc={(oldBox, newBox) => {
                      return newBox;
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