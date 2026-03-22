import torch
import sys
import os

def check_gpu():
    print(f"Python version: {sys.version}")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"Device count: {torch.cuda.device_count()}")
        print(f"Device name: {torch.cuda.get_device_name(0)}")
        
        # Test a small tensor operation on GPU
        try:
            x = torch.randn(5, 5).cuda()
            y = x @ x.T
            print("Successfully performed matrix multiplication on GPU!")
        except Exception as e:
            print(f"Error during GPU operation: {e}")
    else:
        print("CUDA NOT AVAILABLE - SadTalker will run on CPU (Slow)")

if __name__ == "__main__":
    check_gpu()
