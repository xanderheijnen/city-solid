"""Configuration — loads from environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_JWT_SECRET: str = os.environ["SUPABASE_JWT_SECRET"]

# CORS: frontend origins allowed to call backend
CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://xanderheijnen.github.io",
]
