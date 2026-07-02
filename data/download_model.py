"""
Download and cache the PlantVillage plant disease classifier from HuggingFace Hub.
Run once before demo: python data/download_model.py
Model: linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification
"""
import os
import sys

def download_model():
    print("📥 Downloading PlantVillage disease classifier from HuggingFace Hub...")
    print("   Model: linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification")
    print()

    try:
        from transformers import pipeline
        import torch
        device = 0 if torch.cuda.is_available() else -1
        device_name = "GPU (CUDA)" if device == 0 else "CPU"
        print(f"   Device: {device_name}")

        print("   Downloading model weights (this may take a minute on first run)...")
        clf = pipeline(
            "image-classification",
            model="linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification",
            device=device
        )
        print("✅ Model downloaded and cached successfully!")
        print()

        # Quick validation with a dummy image
        print("🔍 Running validation inference...")
        from PIL import Image
        import numpy as np
        dummy_img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
        results = clf(dummy_img, top_k=3)
        print(f"   Sample output (random image — labels expected): {[r['label'] for r in results]}")
        print("✅ Model validation passed!")

    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Run: pip install transformers torch pillow")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Download failed: {e}")
        sys.exit(1)

    print()
    print("🚀 Model is ready. You can now start the backend: uvicorn backend.main:app --reload")

if __name__ == "__main__":
    download_model()
