import os

def setup_links():
    sadtalker_dir = "SadTalker"
    models_root = "/app/models"
    
    # 1. Check checkpoints
    target_ckpt = os.path.join(sadtalker_dir, "checkpoints")
    source_ckpt = os.path.join(models_root, "sadtalker", "checkpoints")
    if os.path.exists(source_ckpt) and not os.path.exists(target_ckpt):
        print(f"Creating symlink: {target_ckpt} -> {source_ckpt}")
        os.symlink(source_ckpt, target_ckpt)
    
    # 2. Check gfpgan/weights
    target_gfpgan = os.path.join(sadtalker_dir, "gfpgan", "weights")
    source_gfpgan = os.path.join(models_root, "sadtalker", "gfpgan", "weights")
    if os.path.exists(source_gfpgan):
        os.makedirs(os.path.dirname(target_gfpgan), exist_ok=True)
        if os.path.islink(target_gfpgan):
             os.unlink(target_gfpgan)
        elif os.path.isdir(target_gfpgan):
             # move existing files if any or just remove?
             # better to just rename the old dir if it's not a link
             import shutil
             shutil.move(target_gfpgan, target_gfpgan + "_backup")
             
        print(f"Creating symlink: {target_gfpgan} -> {source_gfpgan}")
        os.symlink(source_gfpgan, target_gfpgan)

if __name__ == "__main__":
    setup_links()
