from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Flask backend is running"})

@app.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint to process prompts through OpenAI API
    Expects JSON: {"prompt": "your prompt here", "model": "gpt-4.1-nano" (optional)}
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
        
        prompt = data['prompt']
        model = data.get('model', 'gpt-4.1-nano')  # Default to gpt-3.5-turbo
        
        if not prompt.strip():
            return jsonify({"error": "Empty prompt provided"}), 400
        
        # Check if API key is configured
        if not openai.api_key:
            return jsonify({"error": "OpenAI API key not configured"}), 500
        
        # Prepend instructions to the user prompt
        system_prompt = """You must respond ONLY with valid JSON on a single line without any newlines or formatting. Analyze the user's prompt and create a dashboard specification. Return JSON with the following structure:

{
  "dash_name": "A descriptive name for the dashboard",
  "category": "sports" | "sales" | "course" | "n/a",
  "widgets": [
    {
      "name": "Widget name describing what it shows",
      "type": "bar" | "line" | "number",
      "source": "Exact API endpoint URL where this data can be retrieved"
    }
  ]
}

Guidelines:
- Choose 2-4 relevant widgets based on the user's request
- Provide exact API endpoint URLs (e.g., "https://api.sportsdata.io/v3/nba/scores/json/TeamSeasonStats/2024", "https://api.salesforce.com/data/v54.0/analytics/reports")
- Make widget names descriptive and relevant to the prompt
- Choose appropriate chart types: "bar" for comparisons, "line" for trends over time, "number" for single metrics
- Use realistic, well-known API endpoints that actually exist
- Return compact JSON without any newlines, spaces, or formatting

User prompt: """
        
        full_prompt = system_prompt + prompt
        
        # Make request to OpenAI API
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that responds only in valid JSON format."},
                {"role": "user", "content": full_prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        # Extract the response text
        ai_response = response.choices[0].message.content
        
        # Handle usage data safely
        usage_data = None
        if hasattr(response, 'usage') and response.usage:
            try:
                usage_data = dict(response.usage)
            except Exception:
                usage_data = None
        
        return jsonify({
            "success": True,
            "response": ai_response,
            "model": model,
            "usage": usage_data
        })
        
    except openai.error.AuthenticationError:
        return jsonify({"error": "Invalid OpenAI API key"}), 401
    except openai.error.RateLimitError:
        return jsonify({"error": "OpenAI API rate limit exceeded"}), 429
    except openai.error.APIError as e:
        return jsonify({"error": f"OpenAI API error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000) 