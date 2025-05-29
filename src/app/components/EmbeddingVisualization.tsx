"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useTranslations } from 'next-intl';
import Card from './Card';
import Button from './Button';
import NextImage from 'next/image';

// Interfaces
interface ImageInfo {
  id: string;
  name: string;
  url: string;
  originalIndex: number;
}

interface VisualizationData {
  position: [number, number];
  imageInfo: ImageInfo;
  embedding: Float32Array;
}

interface EmbeddingVisualizationProps {
  embeddings: (Float32Array | null)[];
  imageInfos: ImageInfo[];
  imageGroups: number[][];
  onVisualizationReady?: () => void;
  title?: string;
}

interface TooltipData {
  x: number;
  y: number;
  imageInfo: ImageInfo;
  visible: boolean;
}

const EmbeddingVisualization: React.FC<EmbeddingVisualizationProps> = ({
  embeddings,
  imageInfos,
  imageGroups,
  onVisualizationReady,
  title = "Embedding Visualization"
}) => {
  const t = useTranslations('ImageDuplicateDetectionPage');
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const umapWorkerRef = useRef<Worker | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [visualizationData, setVisualizationData] = useState<VisualizationData[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData>({ x: 0, y: 0, imageInfo: { id: '', name: '', url: '', originalIndex: 0 }, visible: false });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize UMAP worker
  useEffect(() => {
    const worker = new Worker(new URL('../[locale]/ai-photo-duplicate-finder/umap.worker.js', import.meta.url), {
      type: 'module',
    });
    umapWorkerRef.current = worker;

    worker.onmessage = (event) => {
      const { status, data, epoch } = event.data;
      
      switch (status) {
        case 'worker_ready':
          console.log('UMAP worker ready');
          break;
        case 'starting':
        case 'progress':
          setProcessingStatus(data + (epoch ? ` (epoch ${epoch})` : ''));
          break;
        case 'complete':
          const { reducedEmbeddings, imageIds } = data;
          handleUMAPComplete(reducedEmbeddings, imageIds);
          break;
        case 'error':
          console.error('UMAP Worker Error:', data);
          setProcessingStatus(`Error: ${data}`);
          setIsProcessing(false);
          break;
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || isCollapsed) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(400, width * 0.6);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // White background
    sceneRef.current = scene;

    // Camera (orthographic for 2D-like view)
    const camera = new THREE.OrthographicCamera(
      -width / 200, width / 200,
      height / 200, -height / 200,
      1, 1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Mouse interaction for tooltips
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 0.1;
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!pointsRef.current || !cameraRef.current || visualizationData.length === 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObject(pointsRef.current);

      if (intersects.length > 0) {
        const pointIndex = intersects[0].index;
        if (pointIndex !== undefined && pointIndex < visualizationData.length) {
          setHoveredPointIndex(pointIndex);
          
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
          }
          
          const imageInfo = visualizationData[pointIndex].imageInfo;
          tooltipTimeoutRef.current = setTimeout(() => {
            setTooltip({
              x: event.clientX,
              y: event.clientY,
              imageInfo,
              visible: true
            });
          }, 150);
        }
      } else {
        setHoveredPointIndex(null);
        
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
          tooltipTimeoutRef.current = null;
        }
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    };

    const handleMouseLeave = () => {
      setHoveredPointIndex(null);
      
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
      setTooltip(prev => ({ ...prev, visible: false }));
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop for smooth interactions
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (pointsRef.current && pointsRef.current.material) {
        // Update time uniform for pulse animation
        (pointsRef.current.material as THREE.ShaderMaterial).uniforms.time.value = performance.now() * 0.001;
      }
      
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };
    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
      
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isCollapsed, visualizationData]);

  const handleUMAPComplete = useCallback((reducedEmbeddings: number[][], imageIds: string[]) => {
    const newVisualizationData: VisualizationData[] = [];
    
    reducedEmbeddings.forEach((coords, index) => {
      const imageId = imageIds[index];
      const imageInfo = imageInfos.find(info => info.id === imageId);
      const embedding = embeddings[imageInfo?.originalIndex ?? -1];
      
      if (imageInfo && embedding) {
        newVisualizationData.push({
          position: [coords[0], coords[1]],
          imageInfo,
          embedding
        });
      }
    });

    setVisualizationData(newVisualizationData);
    setIsProcessing(false);
    setProcessingStatus('');
    onVisualizationReady?.();
  }, [imageInfos, embeddings, onVisualizationReady]);

  // Create point cloud from visualization data
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || visualizationData.length === 0) {
      return;
    }

    // Remove existing points
    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
    }

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    // Create group color mapping
    const groupColors = new Map<number, THREE.Color>();
    const colorPalette = [
      new THREE.Color(0xff6b6b), // Red
      new THREE.Color(0x4ecdc4), // Teal  
      new THREE.Color(0x45b7d1), // Blue
      new THREE.Color(0xf9ca24), // Yellow
      new THREE.Color(0x6c5ce7), // Purple
      new THREE.Color(0xa55eea), // Pink
      new THREE.Color(0x26de81), // Green
      new THREE.Color(0xfd79a8), // Rose
      new THREE.Color(0x00b894), // Emerald
      new THREE.Color(0xe17055), // Orange
    ];

    imageGroups.forEach((group, groupIndex) => {
      if (group.length > 1) {
        groupColors.set(groupIndex, colorPalette[groupIndex % colorPalette.length]);
      }
    });

    visualizationData.forEach((data, index) => {
      positions.push(data.position[0], data.position[1], 0);
      
      // Find which group this image belongs to
      let groupIndex = -1;
      for (let i = 0; i < imageGroups.length; i++) {
        if (imageGroups[i].includes(data.imageInfo.originalIndex)) {
          groupIndex = i;
          break;
        }
      }
      
      // Set color based on group membership and hover state
      let color = new THREE.Color(0x000000); // Default black for unique images
      if (groupIndex !== -1 && imageGroups[groupIndex].length > 1) {
        color = groupColors.get(groupIndex) || new THREE.Color(0x000000);
      }
      
      // Highlight hovered point with brighter color
      if (index === hoveredPointIndex) {
        color = new THREE.Color(1.0, 1.0, 1.0); // White for hover effect and pulse
      }
      
      colors.push(color.r, color.g, color.b);
      
      // Make hovered point larger
      const baseSize = imageGroups[groupIndex]?.length > 1 ? 10.0 : 8.0;
      const size = index === hoveredPointIndex ? baseSize * 1.5 : baseSize;
      sizes.push(size);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // Custom shader material for volumetric points
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointScale: { value: window.devicePixelRatio },
        time: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        uniform float pointScale;
        
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pointScale;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        uniform float time;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float distance = length(center);
          
          // Discard pixels outside the circle
          if (distance > 0.5) discard;
          
          // Create concentric circles for volume effect
          float outerBorder = 0.48;
          float innerBorder = 0.35;
          float core = 0.20;
          
          // Calculate depth based on distance from center (sphere effect)
          float depth = sqrt(1.0 - distance * distance * 4.0);
          
          // Base color with lighting effect
          vec3 finalColor = vColor;
          
          if (distance > outerBorder) {
            // Dark outer border for definition
            finalColor = vec3(0.0, 0.0, 0.0);
          } else if (distance > innerBorder) {
            // Gradient border for volume
            float borderGradient = (distance - innerBorder) / (outerBorder - innerBorder);
            finalColor = mix(vColor * 0.7, vec3(0.0, 0.0, 0.0), borderGradient);
          } else if (distance > core) {
            // Main body with subtle shading
            float bodyGradient = (distance - core) / (innerBorder - core);
            finalColor = mix(vColor * 1.2, vColor * 0.8, bodyGradient);
          } else {
            // Bright center highlight for volume
            float highlight = 1.0 - (distance / core);
            finalColor = vColor + vec3(0.3, 0.3, 0.3) * highlight;
          }
          
          // Add depth-based lighting
          float lighting = 0.8 + 0.4 * depth;
          finalColor *= lighting;
          
          // Subtle pulse effect for hovered points (when very bright)
          if (vColor.r > 0.9 && vColor.g > 0.9 && vColor.b > 0.9) {
            float pulse = 0.95 + 0.1 * sin(time * 8.0);
            finalColor *= pulse;
            
            // Add white rim for hovered state
            if (distance > innerBorder && distance <= outerBorder) {
              finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), 0.6);
            }
          }
          
          // Ensure colors don't exceed 1.0
          finalColor = clamp(finalColor, 0.0, 1.0);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      vertexColors: true,
      transparent: false
    });

    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    sceneRef.current.add(points);

    // Auto-fit camera to show all points
    const box = new THREE.Box3().setFromObject(points);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y);
    const fov = maxDim * 1.2;
    
    if (cameraRef.current) {
      cameraRef.current.left = center.x - fov / 2;
      cameraRef.current.right = center.x + fov / 2;
      cameraRef.current.top = center.y + fov / 2;
      cameraRef.current.bottom = center.y - fov / 2;
      cameraRef.current.updateProjectionMatrix();
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [visualizationData, imageGroups, hoveredPointIndex]);

  const startVisualization = () => {
    if (!umapWorkerRef.current || embeddings.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(t('VisualizationGeneratingButton'));
    setIsCollapsed(false);

    // Filter out null embeddings and prepare data
    const validEmbeddings: Float32Array[] = [];
    const validImageIds: string[] = [];

    embeddings.forEach((embedding, index) => {
      if (embedding && imageInfos[index]) {
        validEmbeddings.push(embedding);
        validImageIds.push(imageInfos[index].id);
      }
    });

    if (validEmbeddings.length < 3) {
      setProcessingStatus(t('VisualizationNeedMinImages'));
      setIsProcessing(false);
      return;
    }

    umapWorkerRef.current.postMessage({
      type: 'reduce_dimensions',
      data: {
        embeddings: validEmbeddings,
        imageIds: validImageIds,
        options: {
          nNeighbors: Math.min(15, Math.max(2, Math.floor(validEmbeddings.length / 3))),
          minDist: 0.1,
          spread: 1.0
        }
      }
    });
  };

  const toggleVisualization = () => {
    if (isCollapsed && visualizationData.length === 0) {
      startVisualization();
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const hasValidData = embeddings.some(emb => emb !== null) && imageInfos.length > 0;

  return (
    <>
      <Card title={title || t('VisualizationTitle')} variant="accent" collapsible={false}>
        <div className="space-y-4">
          {!hasValidData ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                {t('VisualizationNoDataMessage')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {t('VisualizationDescription')}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleVisualization}
                  disabled={isProcessing}
                >
                  {isProcessing 
                    ? t('VisualizationGeneratingButton')
                    : isCollapsed 
                      ? t('VisualizationShowButton')
                      : t('VisualizationHideButton')
                  }
                </Button>
              </div>

              {isProcessing && (
                <div className="text-center py-4">
                  <div className="text-sm font-medium text-blue-600">
                    {processingStatus}
                  </div>
                </div>
              )}

              {!isCollapsed && (
                <div 
                  ref={containerRef} 
                  className="w-full brutalist-border bg-white"
                  style={{ minHeight: '400px' }}
                />
              )}
            </>
          )}
        </div>
      </Card>

      {/* Tooltip */}
      {tooltip.visible && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{ 
            left: tooltip.x + 10, 
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="brutalist-border bg-white p-2 shadow-brutalist max-w-xs">
            <div className="relative w-24 h-24 mb-2">
              <NextImage
                src={tooltip.imageInfo.url}
                alt={tooltip.imageInfo.name}
                fill
                className="object-cover"
              />
            </div>
            <p className="text-xs font-medium truncate">
              {tooltip.imageInfo.name}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default EmbeddingVisualization; 