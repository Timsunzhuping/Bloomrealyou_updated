'use client';

import type Konva from 'konva';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  Group,
  Image as KonvaImage,
  Layer as KonvaLayer,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva';
import useImage from 'use-image';

import { useCustomizerStore } from './store';
import type { ImageLayer, Layer, TextLayer } from './types';

export interface CanvasStageHandle {
  /** Returns a PNG data URL of the current stage. */
  exportPreview(pixelRatio?: number): string | null;
  /** Returns a PNG data URL cropped to the printable area, without mockup/guides. */
  exportProduction(pixelRatio?: number): string | null;
}

interface CanvasStageProps {
  /** Mockup image rendered behind the design surface. */
  mockupSrc: string;
  /** Resize stage to this width. Height auto from canvas aspect. */
  containerWidth: number;
}

export const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(function CanvasStage(
  { mockupSrc, containerWidth },
  ref,
) {
  const stageRef = useRef<Konva.Stage>(null);
  const guideLayerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRefs = useRef<Map<string, Konva.Node>>(new Map());

  const canvasWidth = useCustomizerStore((s) => s.canvasWidth);
  const canvasHeight = useCustomizerStore((s) => s.canvasHeight);
  const printArea = useCustomizerStore((s) => s.printArea);
  const safeArea = useCustomizerStore((s) => s.safeArea);
  const layers = useCustomizerStore((s) => s.layers);
  const selectedLayerId = useCustomizerStore((s) => s.selectedLayerId);
  const updateLayer = useCustomizerStore((s) => s.updateLayer);
  const selectLayer = useCustomizerStore((s) => s.selectLayer);

  const scale = containerWidth / canvasWidth;
  const stageHeight = canvasHeight * scale;

  const [mockup] = useImage(mockupSrc, 'anonymous');

  // Wire transformer to the currently-selected node.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selectedLayerId ? layerRefs.current.get(selectedLayerId) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedLayerId, layers]);

  useImperativeHandle(
    ref,
    () => ({
      exportPreview(pixelRatio = 2) {
        const stage = stageRef.current;
        if (!stage) return null;
        // Briefly hide the transformer + safe-area markers so the preview is clean.
        const tr = transformerRef.current;
        tr?.visible(false);
        const data = stage.toDataURL({ pixelRatio });
        tr?.visible(true);
        return data;
      },
      exportProduction(pixelRatio = 4) {
        const stage = stageRef.current;
        if (!stage) return null;
        const tr = transformerRef.current;
        const guides = guideLayerRef.current;
        tr?.visible(false);
        guides?.visible(false);
        const data = stage.toDataURL({
          x: printArea.x * scale,
          y: printArea.y * scale,
          width: printArea.width * scale,
          height: printArea.height * scale,
          pixelRatio: Math.max(pixelRatio / scale, 1),
        });
        guides?.visible(true);
        tr?.visible(true);
        return data;
      },
    }),
    [printArea.height, printArea.width, printArea.x, printArea.y, scale],
  );

  const onStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void => {
    if (e.target === e.target.getStage()) selectLayer(null);
  };

  const handleTransformEnd = (id: string) => (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Node;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    updateLayer(id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(20, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  const handleDragEnd = (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
    updateLayer(id, { x: e.target.x(), y: e.target.y() });
  };

  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={stageHeight}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={onStageClick}
      onTouchStart={onStageClick}
      className="bg-muted"
    >
      <KonvaLayer ref={guideLayerRef} listening={false}>
        {/* Product mockup background */}
        {mockup && (
          <KonvaImage
            image={mockup}
            width={canvasWidth}
            height={canvasHeight}
            opacity={0.4}
          />
        )}
        {/* Print area outline */}
        <Rect
          x={printArea.x}
          y={printArea.y}
          width={printArea.width}
          height={printArea.height}
          stroke="#3b82f6"
          dash={[8, 6]}
          strokeWidth={2}
          listening={false}
        />
        {/* Safe area outline */}
        <Rect
          x={safeArea.x}
          y={safeArea.y}
          width={safeArea.width}
          height={safeArea.height}
          stroke="#10b981"
          dash={[4, 4]}
          strokeWidth={1.5}
          listening={false}
        />
      </KonvaLayer>

      <KonvaLayer>
        {layers.map((layer) =>
          layer.type === 'text' ? (
            <TextLayerNode
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              onSelect={() => selectLayer(layer.id)}
              onDragEnd={handleDragEnd(layer.id)}
              onTransformEnd={handleTransformEnd(layer.id)}
              registerNode={(node) => {
                if (node) layerRefs.current.set(layer.id, node);
                else layerRefs.current.delete(layer.id);
              }}
            />
          ) : (
            <ImageLayerNode
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              onSelect={() => selectLayer(layer.id)}
              onDragEnd={handleDragEnd(layer.id)}
              onTransformEnd={handleTransformEnd(layer.id)}
              registerNode={(node) => {
                if (node) layerRefs.current.set(layer.id, node);
                else layerRefs.current.delete(layer.id);
              }}
            />
          ),
        )}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'middle-left',
            'middle-right',
            'top-center',
            'bottom-center',
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            // Prevent inverted boxes
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      </KonvaLayer>
    </Stage>
  );
});

interface LayerNodeProps<L extends Layer> {
  layer: L;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  registerNode: (node: Konva.Node | null) => void;
}

function TextLayerNode({
  layer,
  onSelect,
  onDragEnd,
  onTransformEnd,
  registerNode,
}: LayerNodeProps<TextLayer>): JSX.Element {
  return (
    <Group ref={registerNode} visible={layer.visible}>
      <Text
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        opacity={layer.opacity}
        text={layer.text}
        fontFamily={layer.fontFamily}
        fontSize={layer.fontSize}
        fontStyle={layer.fontWeight >= 600 ? 'bold' : 'normal'}
        fill={layer.color}
        align={layer.textAlign}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
    </Group>
  );
}

function ImageLayerNode({
  layer,
  onSelect,
  onDragEnd,
  onTransformEnd,
  registerNode,
}: LayerNodeProps<ImageLayer>): JSX.Element {
  const [img] = useImage(layer.src, 'anonymous');
  const node = useMemo(() => img ?? undefined, [img]);
  return (
    <KonvaImage
      ref={registerNode as never}
      image={node}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}
