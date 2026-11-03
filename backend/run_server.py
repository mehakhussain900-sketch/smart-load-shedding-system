import uvicorn
import sys
import asyncio
from pathlib import Path

# On Windows, use WindowsSelectorEventLoopPolicy to prevent WinError 10053 / 64 crashes when ESP32 drops connection
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Ensure backend root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
