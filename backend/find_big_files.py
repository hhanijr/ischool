import os
from pathlib import Path

def find_large_files(start_path, min_size_mb=100):
    print(f"Searching for files larger than {min_size_mb}MB in: {start_path}\n")
    found = False
    for root, dirs, files in os.walk(start_path):
        for file in files:
            path = Path(root) / file
            size_mb = path.stat().st_size / (1024 * 1024)
            if size_mb > min_size_mb:
                print(f"Found: {path.relative_to(start_path)} | Size: {size_mb:.2f} MB")
                found = True
    if not found:
        print("No large files found.")

if __name__ == "__main__":
    # ابحث جوه فولدر الباك إند
    backend_path = Path(__file__).parent.absolute()
    find_large_files(backend_path)