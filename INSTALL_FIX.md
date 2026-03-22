# Fixing Installation Issues

## Issue: numpy installation error

If you're getting `AttributeError: module 'pkgutil' has no attribute 'ImpImporter'` when installing requirements:

### Solution 1: Upgrade pip and setuptools first

```powershell
python -m pip install --upgrade pip setuptools wheel
```

### Solution 2: Install numpy separately first

```powershell
pip install numpy>=1.26.0
```

Then install the rest:
```powershell
pip install -r requirements.txt
```

### Solution 3: Use pre-built wheels (Windows)

If you're on Windows and still having issues, try installing from pre-built wheels:

```powershell
pip install --only-binary :all: -r requirements.txt
```

### Solution 4: Install packages individually

If the above doesn't work, install packages one by one:

```powershell
pip install fastapi
pip install uvicorn[standard]
pip install python-multipart
pip install pypdf2
pip install chromadb
pip install google-generativeai
pip install sqlalchemy
pip install python-dotenv
pip install pydantic
pip install numpy
pip install sentence-transformers
```

### Solution 5: Check Python version

Make sure you're using Python 3.8 or higher:

```powershell
python --version
```

If you have Python 3.12+, you may need to use a specific numpy version:

```powershell
pip install "numpy>=1.26.0,<2.0"
```

