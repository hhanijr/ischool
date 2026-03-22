import os
from groq import Groq
from typing import Dict, List
import json
from dotenv import load_dotenv

# Global variables for model initialization
_client = None
_groq_configured = False

def _ensure_env_loaded():
    """
    Ensure the GROQ_API_KEY is loaded from the backend .env file.
    This is defensive in case the app is started from a different working directory
    or before main.py's load_dotenv has run.
    """
    # If the variable is already present, don't touch it
    if os.getenv("GROQ_API_KEY"):
        return

    # Compute backend/.env path relative to this file
    # This file is in backend/utils/, so go up two levels to get backend/
    current_file = os.path.abspath(__file__)
    backend_dir = os.path.dirname(os.path.dirname(current_file))
    env_path = os.path.join(backend_dir, ".env")
    
    # Try to load the .env file
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)
    else:
        # Fallback: try loading from current directory
        load_dotenv(".env", override=True)

def _get_client():
    """Lazy initialization of Groq client"""
    global _client, _groq_configured

    if _client is None:
        # Make sure .env is loaded before reading GROQ_API_KEY
        _ensure_env_loaded()

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY environment variable is not set. "
                "Please create a .env file in the backend directory with: GROQ_API_KEY=your_key_here"
            )

        _client = Groq(api_key=api_key)
        _groq_configured = True

    return _client

async def _groq_completion(prompt: str, temperature: float = 0.7, max_tokens: int = 2000, model: str = "llama-3.1-8b-instant") -> str:
    """
    Helper function to make Groq API calls
    
    Args:
        prompt: The prompt text
        temperature: Temperature for generation (default: 0.7)
        max_tokens: Maximum tokens to generate (default: 2000)
        model: Model to use (default: llama-3.1-70b-versatile)
    
    Returns:
        str: The generated text response
    """
    client = _get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response.choices[0].message.content

async def generate_lesson_title(content: str) -> str:
    """Generate a title for the lesson based on content"""
    try:
        prompt = f"""You are an educational content expert. Generate a concise, descriptive title (maximum 10 words) for the given lesson content.

Lesson content:
{content[:1000]}

Generate a title:"""
        
        response = await _groq_completion(prompt, temperature=0.7, max_tokens=50)
        return response.strip()
    except ValueError as e:
        # Re-raise ValueError (API key missing) with clear message
        raise
    except Exception as e:
        return f"Lesson {hash(content) % 10000}"  # Fallback title

async def generate_explanation(content: str) -> str:
    """Generate an explanation/summary of the lesson.

    The function asks the LLM to produce 4-6 sections using '## ' headers. If the LLM call
    fails, it falls back to a deterministic extractor implemented in
    `_generate_detailed_fallback`.
    """
    # Prepare a preview of the content to keep prompt size bounded
    content_preview = content[:5000] if len(content) > 5000 else content

    try:
        prompt = f"""You are a friendly, clear, and professional AI instructor.

Please explain the provided Educational Content to a general audience using a conversational style.

Requirements:
- Structure the output into 4 to 6 sections.
- Use Markdown level-2 headers for every section. Each section MUST start with a line that begins with "## " followed by a concise informative title.
- After each header, provide the section content (one or more paragraphs).
- Do NOT include any text outside these sections; the output should contain only the sections.

Include a short hook in the first section and a concise conclusion in the last section.
Keep total length in the range of approximately 400-800 words.

Educational Content:
{content_preview}

Produce the explanation following the constraints above."""

        response = await _groq_completion(prompt, temperature=0.7, max_tokens=2000)
        return response.strip()
    except ValueError:
        # API key or configuration error - re-raise so caller can handle it
        raise
    except Exception:
        # If generation fails, fall back to a deterministic extractor
        try:
            return await _generate_detailed_fallback(content_preview[:4000] if len(content_preview) > 4000 else content_preview)
        except Exception:
            return "Explanation unavailable."

async def _generate_detailed_fallback(content: str) -> str:
    """Generate a detailed explanation from content when AI fails"""
    try:
        # Extract structured content
        lines = content.split('\n')
        
        # Find title/heading (usually first non-empty line or line with few words)
        title = ""
        for line in lines[:10]:
            stripped = line.strip()
            if stripped and len(stripped) < 100 and not stripped.startswith('•') and not stripped.startswith('-'):
                title = stripped
                break
        
        # Extract key points and concepts
        key_points = []
        paragraphs = []
        current_para = ""
        
        for line in lines[:100]:  # Process first 100 lines
            stripped = line.strip()
            if not stripped:
                if current_para and len(current_para) > 50:
                    paragraphs.append(current_para.strip())
                    current_para = ""
                continue
            
            # Check for bullet points or key concepts
            if stripped.startswith('•') or stripped.startswith('-') or stripped.startswith('*'):
                key_points.append(stripped.lstrip('•-* ').strip())
            elif len(stripped) > 20:
                current_para += stripped + " "
            elif current_para:
                paragraphs.append(current_para.strip())
                current_para = ""
        
        if current_para:
            paragraphs.append(current_para.strip())
        
        # Build detailed explanation
        explanation_parts = []
        
        # Introduction paragraph
        intro = f"{title} is an important topic in this lesson. " if title else "This lesson covers important educational concepts. "
        if paragraphs:
            intro += paragraphs[0][:300] if len(paragraphs[0]) > 300 else paragraphs[0]
            explanation_parts.append(intro)
        
        # Main content paragraphs
        for para in paragraphs[1:4]:  # Include next 3 paragraphs
            if len(para) > 100:
                explanation_parts.append(para)
        
        # Add key points if available
        if key_points and len(key_points) > 0:
            points_text = "Key concepts include: " + "; ".join(key_points[:5])
            explanation_parts.append(points_text)
        
        # Combine into detailed explanation
        if explanation_parts:
            explanation = "\n\n".join(explanation_parts)
            if len(explanation) > 300:
                return explanation
        
        # Fallback: extract more sentences
        full_text = content[:3000].replace('\n', ' ').strip()
        sentences = [s.strip() for s in full_text.split('.') if len(s.strip()) > 30]
        if len(sentences) >= 8:
            explanation = '. '.join(sentences[:10]) + '.'
            if len(explanation) > 300:
                return explanation
        
        return "Detailed explanation could not be generated. Please review the lesson content below for complete information."
    except Exception as e:
        print(f"Error in detailed fallback: {e}")
        return "Detailed explanation could not be generated. Please review the lesson content below for complete information."

async def _generate_simple_explanation(content: str) -> str:
    """Fallback method to generate a simpler explanation when main method fails"""
    try:
        # Use a very simple, neutral prompt with limited content
        # Clean the content to remove any potentially problematic words
        clean_content = content[:1500].replace('\n', ' ').strip()
        
        simple_prompt = f"""Create a brief educational summary in 2 paragraphs:

{clean_content}

Educational summary:"""
        
        response = await _groq_completion(simple_prompt, temperature=0.3, max_tokens=500)
        if response and len(response.strip()) > 50:
            return response.strip()
    except:
        pass
    
    # Ultimate fallback - extract meaningful content from the file
    try:
        # Extract more content - first 2000 characters
        preview = content[:2000].strip()
        
        # Try to identify key sections (look for headings, bullet points, etc.)
        lines = preview.split('\n')
        key_sections = []
        
        # Look for lines that might be headings (short lines, all caps, or with special formatting)
        for i, line in enumerate(lines[:30]):  # Check first 30 lines
            line_stripped = line.strip()
            if len(line_stripped) > 10 and len(line_stripped) < 100:
                # Could be a heading or important point
                if line_stripped and not line_stripped.startswith('•') and not line_stripped.startswith('-'):
                    key_sections.append(line_stripped)
        
        # Extract meaningful paragraphs
        paragraphs = []
        current_para = ""
        for line in lines[:50]:  # Check first 50 lines
            line_stripped = line.strip()
            if line_stripped:
                if len(line_stripped) > 20:  # Substantial line
                    current_para += line_stripped + " "
                elif current_para:
                    paragraphs.append(current_para.strip())
                    current_para = ""
        
        if current_para:
            paragraphs.append(current_para.strip())
        
        # Build explanation from extracted content
        explanation_parts = []
        
        # Add title/heading if found
        if key_sections:
            explanation_parts.append(f"This lesson covers: {key_sections[0]}")
        
        # Add first 2-3 substantial paragraphs
        for para in paragraphs[:3]:
            if len(para) > 50:
                explanation_parts.append(para)
        
        # If we have good content, format it nicely
        if explanation_parts:
            explanation = "\n\n".join(explanation_parts)
            if len(explanation) > 100:
                # Add a concluding sentence
                return f"{explanation}\n\nThis lesson provides detailed information on the topic. Please review the full content for complete coverage of all concepts and examples."
        
        # Fallback: use first substantial sentences
        sentences = preview.replace('\n', ' ').split('.')
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
        if len(meaningful_sentences) >= 3:
            explanation = '. '.join(meaningful_sentences[:5]) + '.'
            if len(explanation) > 100:
                return f"{explanation}\n\nThis lesson covers important educational concepts. Please review the full content for complete details and additional examples."
    except Exception as e:
        print(f"Error in fallback explanation: {e}")
    
    # Final fallback - extract at least first paragraph
    try:
        first_para = content[:800].replace('\n', ' ').strip()
        sentences = [s.strip() for s in first_para.split('.') if len(s.strip()) > 20]
        if sentences:
            explanation = '. '.join(sentences[:4]) + '.' if len(sentences) >= 4 else '. '.join(sentences) + '.'
            return f"{explanation}\n\nThis lesson contains detailed educational content. Please review the uploaded material for complete information."
    except:
        pass
    
    # Absolute final fallback
    return "This lesson contains educational content. The AI explanation could not be generated automatically, but the complete lesson material is available for review below."

async def generate_quiz(content: str, num_questions: int = 5) -> List[Dict]:
    """Generate multiple choice questions for the lesson"""
    try:
        # Validate content
        if not content or len(content.strip()) < 50:
            print("Error: Content too short for quiz generation")
            raise ValueError("Lesson content is too short to generate quiz questions")
        
        print(f"Generating quiz with {num_questions} questions for content length: {len(content)}")
        
        # Use full content (don't limit to avoid truncating important info)
        # Limit content length to avoid token limits
        content_for_quiz = content[:8000] if len(content) > 8000 else content
        
        prompt = f"""You are an educational assessment expert. Generate {num_questions} multiple choice questions based on the lesson content.

CRITICAL: You MUST return ONLY a valid JSON array. No markdown, no explanations, no additional text - just the JSON array.

Return the response as a JSON array with this exact format:
[
  {{
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0
  }}
]

Requirements:
- The correct_answer must be the index (0-3) of the correct option
- Each question must have exactly 4 options
- Return ONLY the JSON array, no other text, no markdown code blocks, no explanations
- Ensure the JSON is valid and parseable

Lesson content:
{content_for_quiz}

Generate {num_questions} MCQs as a JSON array:"""
        
        print("Calling Groq API for quiz generation...")
        result = await _groq_completion(prompt, temperature=0.7, max_tokens=2000)
        
        if not result:
            raise ValueError("Could not extract text from API response. The API may have blocked the content or returned an empty response.")
        
        result = result.strip()
        print(f"Extracted response text (length: {len(result)})")
        
        print(f"Raw response preview: {result[:200]}...")
        
        # Try to extract JSON from markdown code blocks if present
        original_result = result
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0].strip()
            print("Extracted JSON from markdown code block")
        elif "```" in result:
            result = result.split("```")[1].split("```")[0].strip()
            print("Extracted JSON from code block")
        
        # Remove any leading/trailing text that's not JSON
        start_idx = result.find('[')
        end_idx = result.rfind(']') + 1
        if start_idx != -1 and end_idx > start_idx:
            result = result[start_idx:end_idx]
            print(f"Extracted JSON array (length: {len(result)})")
        else:
            print(f"Warning: Could not find JSON array brackets in response")
            # Try to use the original result if extraction failed
            if not result or len(result.strip()) == 0:
                result = original_result
        
        # Try to parse JSON
        quiz_data = None
        try:
            quiz_data = json.loads(result)
        except json.JSONDecodeError as e:
            # If JSON parsing fails, try to fix common issues
            print(f"Initial JSON parse failed: {str(e)}")
            # Try removing any trailing commas or fixing common JSON issues
            try:
                # Remove trailing commas before closing brackets/braces
                fixed_result = result.replace(',]', ']').replace(',}', '}')
                quiz_data = json.loads(fixed_result)
                print("Successfully parsed after fixing trailing commas")
            except:
                # Last attempt: try to extract just the array part more aggressively
                try:
                    # Find the first [ and last ]
                    start = result.find('[')
                    end = result.rfind(']')
                    if start != -1 and end != -1 and end > start:
                        extracted = result[start:end+1]
                        quiz_data = json.loads(extracted)
                        print("Successfully parsed after aggressive extraction")
                    else:
                        raise ValueError(f"Could not find valid JSON array in response. Response preview: {result[:500]}")
                except Exception as e2:
                    error_msg = f"Error parsing JSON from quiz response: {str(e)}\nOriginal error: {str(e2)}\nResponse preview: {result[:500]}"
                    print(f"ERROR: {error_msg}")
                    raise ValueError(error_msg)
        
        # Validate parsed data
        if not isinstance(quiz_data, list):
            raise ValueError(f"Parsed data is not a list: {type(quiz_data)}. Got: {str(quiz_data)[:200]}")
        if len(quiz_data) == 0:
            raise ValueError("Parsed quiz data is empty. The API may not have generated any questions.")
        
        # Validate each question has required fields
        for i, question in enumerate(quiz_data):
            if not isinstance(question, dict):
                raise ValueError(f"Question {i} is not a dictionary: {type(question)}")
            if 'question' not in question or 'options' not in question or 'correct_answer' not in question:
                raise ValueError(f"Question {i} is missing required fields. Has: {list(question.keys())}")
            if not isinstance(question['options'], list) or len(question['options']) < 2:
                raise ValueError(f"Question {i} has invalid options: {question.get('options')}")
        
        print(f"Successfully parsed {len(quiz_data)} quiz questions")
        return quiz_data
    except ValueError as e:
        # Re-raise ValueError (API key missing or validation errors) with clear message
        print(f"ValueError in generate_quiz: {str(e)}")
        raise
    except Exception as e:
        error_msg = f"Unexpected error generating quiz: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        traceback.print_exc()
        raise ValueError(error_msg)

async def answer_question(question: str, context: str) -> str:
    try:
        # ... (أي كود موجود لتقليل حجم السياق) ...

        # أضف التعليمات هنا في نهاية نص الـ prompt
        prompt = f"""
        You are an educational assistant. Answer questions based on the provided lesson content. 
        
        Lesson content:
        {context}

        Question: {question}

        STRICT INSTRUCTIONS FOR GREETINGS:
        - If the user's input is a greeting (e.g., "Hi", "Hello", "How are you?"), respond naturally and warmly in your own words.
        - DO NOT explain any lesson content or provide summaries in response to a simple greeting.
        - Avoid fixed or repetitive responses; vary your words to sound like a real teacher.
        - Only provide academic answers if the user asks a specific question about the content above.

        Answer:"""
        
        # ... (بقية الكود الخاص باستدعاء _groq_completion) ...
        
        # Use a smaller max_tokens to stay within limits
        response = await _groq_completion(prompt, temperature=0.7, max_tokens=500)
        return response.strip()
    except ValueError as e:
        # Re-raise ValueError (API key missing) with clear message
        return f"Configuration error: {str(e)}. Please set GROQ_API_KEY in your .env file."
    except Exception as e:
        error_msg = str(e)
        # Check if it's a token limit error
        if "413" in error_msg or "too large" in error_msg.lower() or "tokens" in error_msg.lower():
            return f"I apologize, but the lesson content is too large to process. Please try asking a more specific question, or the system will use a shorter context automatically."
        return f"I apologize, but I encountered an error while processing your question: {error_msg}"


async def generate_eli5(content: str) -> str:
    """Generate an 'Explain Like I'm 5' simplification of a specific paragraph/section."""
    try:
        content_preview = content[:2000] if len(content) > 2000 else content
        prompt = f"""You are a fun, friendly teacher who loves explaining things simply.

Please explain the following content as if I'm 5 years old (ELI5).
Use simple language, relatable everyday analogies, and a very friendly tone. Keep it concise (1 to 2 short paragraphs).

Content to simplify:
{content_preview}

ELI5 Explanation:"""

        response = await _groq_completion(prompt, temperature=0.7, max_tokens=600)
        return response.strip()
    except Exception as e:
        print(f"ELI5 Error: {e}")
        return "Sorry, I couldn't simplify this right now. Please try again later!"


async def generate_mindmap(content: str) -> dict:
    """Generate a structured JSON for a Mind Map visualization."""
    try:
        content_preview = content[:8000] if len(content) > 8000 else content
        prompt = f"""You are a data structuring AI. Extract the core concepts from the text and arrange them into a mind map graph structure.

CRITICAL: Return ONLY valid JSON matching this structure:
{{
  "nodes": [
    {{"id": "root", "data": {{"label": "Main Topic"}}, "position": {{"x": 250, "y": 0}}, "type": "input"}},
    {{"id": "sub1", "data": {{"label": "Sub Topic"}}, "position": {{"x": 100, "y": 100}}}}
  ],
  "edges": [
    {{"id": "e-root-sub1", "source": "root", "target": "sub1", "animated": true}}
  ]
}}

Requirements:
- Always have exactly ONE root node (id: "root").
- Extract 3 to 6 main sub-topics connected to the root.
- You may add 1 to 2 child nodes to the sub-topics if necessary.
- Estimate X and Y positions so the nodes spread out gracefully (like a tree going downwards or radially).
- DO NOT wrap the JSON in Markdown code blocks like ```json.
- MUST BE valid parseable JSON.

Content to analyze:
{content_preview}
"""
        response = await _groq_completion(prompt, temperature=0.3, max_tokens=1500)
        result = response.strip()

        # Clean markdown wrappers if LLM still adds them
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0].strip()
        elif "```" in result:
            result = result.split("```")[1].split("```")[0].strip()

        parsed = json.loads(result)
        return parsed
    except Exception as e:
        print(f"MindMap Error: {e}")
        # Explicitly raise exception to be handled by the route
        raise ValueError(f"Failed to generate valid mind map JSON: {e}")
