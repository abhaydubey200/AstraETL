import os
import time

def read_final():
    path = "final_qa_out.txt"
    if not os.path.exists(path):
        print("Not found")
        return
    with open(path, "rb") as f:
        data = f.read()
        for enc in ["utf-16", "utf-8", "cp1252"]:
            try:
                text = data.decode(enc)
                lines = text.splitlines()
                print(f"--- Total Lines: {len(lines)} (Enc: {enc}) ---")
                for i in range(0, len(lines), 20):
                    batch = "\n".join(lines[i:i+20])
                    print(batch)
                    print("-" * 20)
                return
            except:
                continue

if __name__ == "__main__":
    read_final()
