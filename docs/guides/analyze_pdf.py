import PyPDF2
import sys

def analyze_pdf(pdf_path):
    try:
        with open(pdf_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            
            print("=== PDF Analysis ===")
            print(f"File: {pdf_path}")
            print(f"Pages: {len(reader.pages)}")
            print(f"Is Encrypted: {reader.is_encrypted}")
            
            if reader.metadata:
                print(f"PDF Version: {reader.metadata.get('/PDF', 'Unknown')}")
                print(f"Creator: {reader.metadata.get('/Creator', 'Unknown')}")
                print(f"Producer: {reader.metadata.get('/Producer', 'Unknown')}")
            else:
                print("No metadata found")
            
            # Check first page
            if len(reader.pages) > 0:
                first_page = reader.pages[0]
                text = first_page.extract_text()
                print(f"First page text length: {len(text)}")
                print(f"First page text preview: {text[:200]}...")
                
                # Check if text is mostly whitespace or special characters
                non_whitespace = len([c for c in text if c.isalnum()])
                print(f"Non-whitespace characters: {non_whitespace}")
                print(f"Text quality ratio: {non_whitespace/len(text)*100:.1f}%" if len(text) > 0 else "0%")
            else:
                print("No pages found")
                
    except Exception as e:
        print(f"Error analyzing PDF: {e}")

if __name__ == "__main__":
    pdf_path = "8.25.25IPanalysis.md.pdf"
    analyze_pdf(pdf_path)
