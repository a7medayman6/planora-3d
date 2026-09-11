import { useEffect, useState } from "react";

/** Loads an HTMLImageElement from a URL (including data: URLs) for use with Konva's <Image>. */
export function useHtmlImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  return image;
}
