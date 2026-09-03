# Local Multimodal Vision and Image Inspection Engine
import os
from pathlib import Path
from typing import Dict, Any
from PIL import Image

from .config import STORAGE_DIR

class MultimodalVisionEngine:

    def __init__(self):
        self.storage_dir = Path(STORAGE_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def inspect_image_file(self, image_path: str) -> Dict[str, Any]:
        path = Path(image_path)
        if not path.exists():
            return {
                "success": False,
                "error": f"Image file not found at '{image_path}'",
            }

        try:
            with Image.open(path) as img:
                width, height = img.size
                img_format = img.format or path.suffix.replace(".", "").upper()
                info = {
                    "filename": path.name,
                    "width": width,
                    "height": height,
                    "format": img_format,
                    "mode": img.mode,
                    "size_bytes": os.path.getsize(path),
                    "aspect_ratio": round(width / max(1, height), 2),
                }
                return {"success": True, "image_info": info}
        except Exception as e:
            return {"success": False, "error": str(e)}

# Shared vision engine instance
vision_engine = MultimodalVisionEngine()


