import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    db_url = os.environ.get("DATABASE_URL")
    print(f"Connecting to {db_url.split('@')[-1]}")
    conn = await asyncpg.connect(db_url)
    try:
        tables = await conn.fetch("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")
        for t in tables:
            print("Table:", t['tablename'])
    except Exception as e:
        print("Error:", e)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
