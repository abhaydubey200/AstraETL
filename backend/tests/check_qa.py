import os

def read_qa_report():
    report_path = "qa_out.txt"
    if not os.path.exists(report_path):
        print(f"Error: {report_path} not found")
        return

    try:
        with open(report_path, "rb") as f:
            content = f.read()
            # Try various encodings
            for enc in ["utf-16", "utf-8", "cp1252"]:
                try:
                    text = content.decode(enc)
                    print(f"--- Decoded with {enc} ---")
                    print(text)
                    return
                except:
                    continue
            print("Error: Could not decode report with any known encoding")
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    read_qa_report()
