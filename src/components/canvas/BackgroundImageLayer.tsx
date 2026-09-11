import { Image as KonvaImage, Layer } from "react-konva";
import type { BackgroundImage } from "../../store/useEditorStore";
import { useHtmlImage } from "../../lib/useHtmlImage";

interface BackgroundImageLayerProps {
  backgroundImage: BackgroundImage;
}

export function BackgroundImageLayer({ backgroundImage }: BackgroundImageLayerProps) {
  const img = useHtmlImage(backgroundImage.src);
  if (!img || !backgroundImage.visible) return null;

  return (
    <Layer listening={false}>
      <KonvaImage
        image={img}
        x={backgroundImage.x}
        y={backgroundImage.y}
        width={img.naturalWidth * backgroundImage.scale}
        height={img.naturalHeight * backgroundImage.scale}
        opacity={backgroundImage.opacity}
      />
    </Layer>
  );
}
