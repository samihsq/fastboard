from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
import requests
import json
import time
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

def fetch_api_data(widget, timeout=10):
    """
    Fetch data from a given API endpoint
    Returns sample data if the API call fails
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(widget['source'], headers=headers, timeout=timeout)
        
        if response.status_code == 200:
            try:
                api_data = response.json()
                # Convert API data to chart-friendly format
                return convert_api_data_to_chart_format(api_data, widget)
            except json.JSONDecodeError:
                pass
    except Exception as e:
        print(f"API call failed for {widget['source']}: {str(e)}")
    
    # Return sample data if API call fails
    return generate_fallback_data(widget)

def convert_api_data_to_chart_format(api_data, widget):
    """
    Convert raw API data to chart-friendly format
    This is a simplified version - you'd customize this based on actual API responses
    """
    chart_type = widget['type']
    
    if isinstance(api_data, dict):
        if chart_type == 'number':
            # For number widgets, try to find a numeric value
            for key, value in api_data.items():
                if isinstance(value, (int, float)):
                    return {"value": value, "label": key}
            return {"value": len(api_data), "label": "Data Points"}
        
        elif chart_type in ['bar', 'line']:
            # For bar/line charts, try to create name-value pairs
            chart_data = []
            count = 0
            for key, value in api_data.items():
                if isinstance(value, (int, float)) and count < 6:
                    chart_data.append({"name": str(key)[:10], "value": value})
                    count += 1
                elif isinstance(value, list) and count < 6:
                    chart_data.append({"name": str(key)[:10], "value": len(value)})
                    count += 1
            return chart_data if chart_data else generate_fallback_data(widget)
    
    elif isinstance(api_data, list) and len(api_data) > 0:
        if chart_type == 'number':
            return {"value": len(api_data), "label": "Total Items"}
        
        elif chart_type in ['bar', 'line']:
            # Try to extract meaningful data from list
            chart_data = []
            for i, item in enumerate(api_data[:6]):  # Limit to 6 items
                if isinstance(item, dict):
                    # Find the first numeric value
                    for key, value in item.items():
                        if isinstance(value, (int, float)):
                            chart_data.append({"name": f"Item {i+1}", "value": value})
                            break
                    else:
                        chart_data.append({"name": f"Item {i+1}", "value": i+1})
                else:
                    chart_data.append({"name": f"Item {i+1}", "value": i+1})
            return chart_data
    
    return generate_fallback_data(widget)

def generate_fallback_data(widget):
    """
    Generate sample data when API calls fail
    """
    chart_type = widget['type']
    
    if chart_type == 'bar':
        return [
            {"name": "Category A", "value": 65},
            {"name": "Category B", "value": 78},
            {"name": "Category C", "value": 52},
            {"name": "Category D", "value": 84}
        ]
    elif chart_type == 'line':
        return [
            {"name": "Jan", "value": 45},
            {"name": "Feb", "value": 55},
            {"name": "Mar", "value": 72},
            {"name": "Apr", "value": 68},
            {"name": "May", "value": 85},
            {"name": "Jun", "value": 92}
        ]
    elif chart_type == 'number':
        return {"value": 73, "label": "Current Metric"}
    else:
        return []

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Flask backend is running"})

@app.route('/generate-dashboard', methods=['POST'])
def generate_dashboard():
    """
    Full dashboard generation endpoint:
    1. Gets prompt from frontend
    2. Calls OpenAI to get dashboard specification
    3. Calls the APIs specified in the response
    4. Returns dashboard with real data
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
        
        prompt = data['prompt']
        model = data.get('model', 'gpt-4.1-nano')
        
        if not prompt.strip():
            return jsonify({"error": "Empty prompt provided"}), 400
        
        # Check if API key is configured
        if not openai.api_key:
            return jsonify({"error": "OpenAI API key not configured"}), 500
        
        # Step 1: Get dashboard specification from OpenAI
        system_prompt = """You must respond ONLY with valid JSON on a single line without any newlines or formatting. Analyze the user's prompt and create a dashboard specification. Return JSON with the following structure:

{"dash_name": "A descriptive name for the dashboard", "category": "sports" | "sales" | "course" | "n/a", "widgets": [{"name": "Widget name describing what it shows", "type": "bar" | "line" | "number", "source": "Exact API endpoint URL where this data can be retrieved"}]}

Guidelines:
- Choose 2-4 relevant widgets based on the user's request
- For sports: use APIs like "https://api.github.com/repos/microsoft/vscode" (as example), "https://jsonplaceholder.typicode.com/posts", "https://api.github.com/users/github"
- For sales/business: use "https://jsonplaceholder.typicode.com/users", "https://httpbin.org/json"
- For courses: use "https://jsonplaceholder.typicode.com/albums", "https://api.github.com/repos/facebook/react"
- Use publicly accessible APIs without authentication
- Make widget names descriptive and relevant to the prompt
- Choose appropriate chart types: "bar" for comparisons, "line" for trends over time, "number" for single metrics
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
        
        # Extract and parse the OpenAI response
        ai_response = response.choices[0].message.content
        
        try:
            dashboard_spec = json.loads(ai_response)
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON response from OpenAI"}), 500
        
        # Step 2: Fetch data from each API endpoint specified in the dashboard
        widgets_with_data = []
        
        # Use ThreadPoolExecutor to fetch data from multiple APIs concurrently
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_widget = {
                executor.submit(fetch_api_data, widget): widget 
                for widget in dashboard_spec.get('widgets', [])
            }
            
            for future in as_completed(future_to_widget):
                widget = future_to_widget[future]
                try:
                    widget_data = future.result()
                    widgets_with_data.append({
                        'name': widget['name'],
                        'type': widget['type'],
                        'source': widget['source'],
                        'data': widget_data
                    })
                except Exception as e:
                    # If data fetching fails, use fallback data
                    widgets_with_data.append({
                        'name': widget['name'],
                        'type': widget['type'],
                        'source': widget['source'],
                        'data': generate_fallback_data(widget)
                    })
        
        # Step 3: Return complete dashboard with data
        dashboard_with_data = {
            'dash_name': dashboard_spec.get('dash_name', 'Generated Dashboard'),
            'category': dashboard_spec.get('category', 'n/a'),
            'widgets': widgets_with_data,
            'generated_at': time.time()
        }
        
        return jsonify({
            "success": True,
            "dashboard": dashboard_with_data,
            "model": model
        })
        
    except openai.error.AuthenticationError:
        return jsonify({"error": "Invalid OpenAI API key"}), 401
    except openai.error.RateLimitError:
        return jsonify({"error": "OpenAI API rate limit exceeded"}), 429
    except openai.error.APIError as e:
        return jsonify({"error": f"OpenAI API error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# Keep the original chat endpoint for backwards compatibility
@app.route('/chat', methods=['POST'])
def chat():
    """
    Original endpoint - now redirects to generate-dashboard
    """
    return generate_dashboard()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000) 