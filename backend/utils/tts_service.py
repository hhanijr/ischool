import edge_tts
import io
import asyncio
from typing import Optional
import pyttsx3
import os

async def _generate_speech_with_pyttsx3_fallback(text: str) -> bytes:
    """
    Offline local fallback for English speech if Edge TTS fails.
    Uses system default English voices.
    """
    try:
        print("Using local pyttsx3 fallback (English)...")
        engine = pyttsx3.init()
        
        # Adjust speech rate (150 is natural for educational content)
        engine.setProperty('rate', 150)
        
        # Temporary path for fallback audio
        temp_wav = 'tts_fallback_temp.wav'
        
        engine.save_to_file(text, temp_wav)
        engine.runAndWait()
        
        if os.path.exists(temp_wav):
            with open(temp_wav, 'rb') as f:
                wav_data = f.read()
            
            # Clean up the temporary file
            os.remove(temp_wav)
            return wav_data
            
        raise Exception("pyttsx3 failed to create audio file")
    except Exception as e:
        print(f"Fallback Error: {str(e)}")
        raise Exception(f"Local TTS Fallback failed: {str(e)}")

async def generate_speech(text: str, gender: str = "male", voice_id: str = None) -> bytes:
    """
    Generate high-quality speech using Edge TTS.
    
    Voices:
    - Male fallback: en-US-GuyNeural
    - Female fallback: en-US-AriaNeural
    """
    try:
        # Choose the specific voice or fallback to default gender ones
        voice = voice_id if voice_id else ("en-US-GuyNeural" if gender == "male" else "en-US-AriaNeural")
        
        # Edge TTS stability: Truncate very long text if necessary
        max_length = 5000 
        safe_text = text[:max_length] if len(text) > max_length else text

        try:
            print(f"🎙️ TTS: Generating English ({gender}) using voice: {voice}")
            
            communicate = edge_tts.Communicate(safe_text, voice)
            
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            if not audio_data:
                raise Exception("Edge TTS returned empty stream")
            
            print(f"✅ Edge TTS Success: {len(audio_data)} bytes generated")
            return audio_data

        except Exception as edge_error:
            # If internet is down or service is unavailable, use local pyttsx3
            print(f"⚠️ Edge TTS failed ({edge_error}). Switching to offline fallback...")
            return await _generate_speech_with_pyttsx3_fallback(safe_text)

    except Exception as e:
        print(f"❌ Critical TTS Error: {str(e)}")
        raise Exception(f"Failed to generate speech: {str(e)}")