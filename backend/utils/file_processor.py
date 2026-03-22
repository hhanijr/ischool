import PyPDF2
import io
from typing import Optional

async def extract_text_from_pdf(file_contents: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(file_contents)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Error extracting text from PDF: {str(e)}")

async def extract_text_from_txt(file_contents: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_contents.decode('utf-8').strip()
    except UnicodeDecodeError:
        # Try with different encoding
        return file_contents.decode('latin-1').strip()

async def process_uploaded_file(file_contents: bytes, file_type: str) -> str:
    """Process uploaded file and return extracted text"""
    if file_type == "application/pdf":
        return await extract_text_from_pdf(file_contents)
    elif file_type == "text/plain":
        return await extract_text_from_txt(file_contents)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

