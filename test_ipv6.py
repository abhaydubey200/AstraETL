import asyncio
import asyncpg
import os

async def test_ipv6():
    db_url = "postgresql://postgres:Abhay%407505991639@[2406:da1c:f42:ae16:b0bf:77d:cff1:9667]:5432/postgres?sslmode=require"
    print(f"Connecting to IPv6: {db_url.split('@')[-1]}")
    try:
        conn = await asyncpg.connect(db_url, timeout=10)
        print("SUCCESS: Connected via IPv6!")
        await conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    asyncio.run(test_ipv6())
