import os
import shutil
from pathlib import Path

def migrate_models():
    # Base directory is /backend/
    backend_dir = Path(__file__).parent.absolute()
    models_dir = backend_dir / "models"
    
    # Target structure
    sad_checkpoints = models_dir / "sadtalker" / "checkpoints"
    sad_gfpgan = models_dir / "sadtalker" / "gfpgan" / "weights"
    
    # Create structure
    for path in [sad_checkpoints, sad_gfpgan]:
        path.mkdir(parents=True, exist_ok=True)
        print(f"Verified directory: {path}")

    # Source locations
    sources = [
        {
            "src": backend_dir / "SadTalker" / "checkpoints",
            "dst": sad_checkpoints,
            "pattern": "*.*"
        },
        {
            "src": backend_dir / "SadTalker" / "gfpgan" / "weights",
            "dst": sad_gfpgan,
            "pattern": "*.*"
        }
    ]

    for source in sources:
        src_path = source["src"]
        dst_path = source["dst"]
        
        if not src_path.exists():
            print(f"Skipping {src_path} (does not exist)")
            continue
            
        print(f"Moving models from {src_path} to {dst_path}...")
        for file_path in src_path.glob(source["pattern"]):
            if file_path.is_file():
                try:
                    shutil.move(str(file_path), str(dst_path / file_path.name))
                    print(f"  Moved: {file_path.name}")
                except Exception as e:
                    print(f"  Error moving {file_path.name}: {e}")

    print("\nMigration complete!")
    print(f"New models folder: {models_dir}")
    print("Please verify the structure and then you can safely delete empty source folders.")

if __name__ == "__main__":
    migrate_models()
