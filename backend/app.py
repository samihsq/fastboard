from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import json
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS with environment variable support
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=ALLOWED_ORIGINS)  # Enable CORS for all routes

# Configure Perplexity API
PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')
PERPLEXITY_BASE_URL = 'https://api.perplexity.ai'

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Flask backend is running"})

@app.route('/generate-dashboard', methods=['POST'])
def generate_dashboard():
    """
    Enhanced dashboard generation endpoint:
    1. Gets prompt from frontend
    2. Uses Perplexity AI to research the topic and gather actual data
    3. Returns dashboard with real, structured data ready for visualization
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
        
        prompt = data['prompt']
        model = data.get('model', 'sonar-pro')
        
        if not prompt.strip():
            return jsonify({"error": "Empty prompt provided"}), 400
        
        # Check if API key is configured
        if not PERPLEXITY_API_KEY:
            return jsonify({"error": "Perplexity API key not configured"}), 500
        
        # Enhanced system prompt for comprehensive data gathering
        system_prompt = """You are a data analyst AI that researches topics and creates comprehensive dashboards with real data. You must respond ONLY with valid JSON on a single line without any newlines or formatting.

Research the given topic thoroughly and return a JSON object with this exact structure:

{"dash_name": "Descriptive dashboard name", "category": "sports" | "business" | "entertainment" | "technology" | "science" | "finance" | "health" | "education" | "other", "widgets": [{"name": "Widget title", "type": "bar" | "line" | "number", "data": DATA_STRUCTURE, "source_url": "URL where you found this specific data"}]}

DATA_STRUCTURE rules:
- For "bar" charts: [{"name": "Category", "value": number}, {"name": "Category2", "value": number}, ...]
- For "line" charts: [{"name": "Period", "value": number}, {"name": "Period2", "value": number}, ...]  
- For "number" widgets: {"value": number, "label": "Description"}

Guidelines:
- Research the topic using current, factual information
- Create 3-4 relevant widgets that best represent the topic
- Use real statistics, numbers, and data points
- For each widget, include the "source_url" field with the actual URL where you found that specific data
- Choose appropriate chart types based on the data:
  * "bar" for comparisons (stats, rankings, categories)
  * "line" for trends over time (years, seasons, periods)
  * "number" for single key metrics (totals, averages, records)
- Make widget names descriptive and specific
- Ensure all values are actual numbers, not strings
- For people: include career stats, achievements, timeline data
- For companies: financial data, market metrics, growth trends
- For topics: relevant statistics, comparisons, historical data
- Include credible source URLs for each widget (e.g., official websites, news sources, databases)
- Return compact JSON without any newlines, spaces, or formatting

Examples:
- Sports person: career stats, seasonal performance, records, awards
- Company: revenue trends, market share, employee count, stock performance
- Technology: adoption rates, market size, growth metrics, comparisons
- Events: attendance, impact metrics, timeline data, comparisons

User topic: """
        
        full_prompt = system_prompt + prompt
        
        # Make request to Perplexity API
        headers = {
            'Authorization': f'Bearer {PERPLEXITY_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a data research assistant that provides factual, current information in structured JSON format."},
                {"role": "user", "content": full_prompt}
            ],
            'max_tokens': 2000,
            'temperature': 0.2
        }
        
        response = requests.post(
            f'{PERPLEXITY_BASE_URL}/chat/completions',
            headers=headers,
            json=payload,
            timeout=45
        )
        
        if response.status_code != 200:
            return jsonify({"error": f"Perplexity API error: {response.status_code} - {response.text}"}), 500
        
        # Extract and parse the Perplexity response
        response_data = response.json()
        ai_response = response_data['choices'][0]['message']['content']
        
        # Clean up the response (remove markdown formatting if present)
        ai_response = ai_response.strip()
        if ai_response.startswith('```json'):
            ai_response = ai_response.replace('```json', '').replace('```', '').strip()
        
        try:
            dashboard_data = json.loads(ai_response)
        except json.JSONDecodeError as e:
            return jsonify({"error": f"Invalid JSON response from Perplexity AI: {str(e)}", "raw_response": ai_response}), 500
        
        # Validate the dashboard structure
        if not isinstance(dashboard_data, dict) or 'widgets' not in dashboard_data:
            return jsonify({"error": "Invalid dashboard structure from Perplexity AI"}), 500
        
        # Add metadata
        dashboard_data['generated_at'] = time.time()
        dashboard_data['data_source'] = 'Perplexity AI Research'
        dashboard_data['model_used'] = model
        
        # Validate each widget has the correct data structure
        for widget in dashboard_data.get('widgets', []):
            if widget.get('type') == 'number':
                if not isinstance(widget.get('data'), dict) or 'value' not in widget['data']:
                    # Provide fallback structure for number widgets
                    widget['data'] = {"value": 0, "label": "No data available"}
            elif widget.get('type') in ['bar', 'line']:
                if not isinstance(widget.get('data'), list):
                    # Provide fallback structure for chart widgets
                    widget['data'] = [{"name": "No data", "value": 0}]
        
        return jsonify({
            "success": True,
            "dashboard": dashboard_data,
            "message": "Dashboard generated with real-time research data"
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network error connecting to Perplexity API: {str(e)}"}), 500
    except KeyError as e:
        return jsonify({"error": f"Unexpected response format from Perplexity API: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/generate-csv-dashboard', methods=['POST'])
def generate_csv_dashboard():
    """
    CSV-based dashboard generation endpoint:
    1. Gets CSV data and prompt from frontend
    2. Uses Perplexity AI to analyze the CSV data and generate insights
    3. Returns dashboard with real, structured data from the CSV analysis
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'prompt' not in data or 'csv_data' not in data:
            return jsonify({"error": "Both prompt and CSV data are required"}), 400
        
        prompt = data['prompt']
        csv_data = data['csv_data']
        model = data.get('model', 'sonar-pro')
        
        if not prompt.strip():
            return jsonify({"error": "Empty prompt provided"}), 400
        
        if not csv_data.strip():
            return jsonify({"error": "Empty CSV data provided"}), 400
        
        # Check if API key is configured
        if not PERPLEXITY_API_KEY:
            return jsonify({"error": "Perplexity API key not configured"}), 500
        
        # Limit CSV data size (first 5000 characters to avoid token limits)
        csv_preview = csv_data[:5000] if len(csv_data) > 5000 else csv_data
        
        # Enhanced system prompt for CSV analysis
        system_prompt = f"""You are a data analyst AI that analyzes CSV data and creates comprehensive dashboards. You must respond ONLY with valid JSON on a single line without any newlines or formatting.

Here is the CSV data to analyze:
```
{csv_preview}
```

Based on the CSV data above and the user's request, create a JSON object with this exact structure:

{{"dash_name": "Descriptive dashboard name", "category": "business" | "sales" | "finance" | "analytics" | "performance" | "other", "widgets": [{{"name": "Widget title", "type": "bar" | "line" | "number", "data": DATA_STRUCTURE, "source_url": "CSV Data Analysis"}}]}}

DATA_STRUCTURE rules:
- For "bar" charts: [{{"name": "Category", "value": number}}, {{"name": "Category2", "value": number}}, ...]
- For "line" charts: [{{"name": "Period", "value": number}}, {{"name": "Period2", "value": number}}, ...]  
- For "number" widgets: {{"value": number, "label": "Description"}}

Guidelines:
- Analyze the actual CSV data provided above
- Create 3-4 relevant widgets that best represent the CSV data and answer the user's question
- Use real data points from the CSV
- Choose appropriate chart types based on the data:
  * "bar" for comparisons, categories, rankings
  * "line" for time series, trends, sequential data
  * "number" for key metrics, totals, averages, counts
- Make widget names descriptive and specific to the CSV content
- Ensure all values are actual numbers extracted from the CSV
- For source_url, always use "CSV Data Analysis"
- Return compact JSON without any newlines, spaces, or formatting
- Focus on the most interesting and relevant insights from the data

User's question about the CSV: """
        
        full_prompt = system_prompt + prompt
        
        # Make request to Perplexity API
        headers = {
            'Authorization': f'Bearer {PERPLEXITY_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a data analyst that analyzes CSV data and provides structured JSON responses for dashboard creation."},
                {"role": "user", "content": full_prompt}
            ],
            'max_tokens': 2000,
            'temperature': 0.1  # Lower temperature for more consistent CSV analysis
        }
        
        response = requests.post(
            f'{PERPLEXITY_BASE_URL}/chat/completions',
            headers=headers,
            json=payload,
            timeout=45
        )
        
        if response.status_code != 200:
            return jsonify({"error": f"Perplexity API error: {response.status_code} - {response.text}"}), 500
        
        # Extract and parse the Perplexity response
        response_data = response.json()
        ai_response = response_data['choices'][0]['message']['content']
        
        # Clean up the response (remove markdown formatting if present)
        ai_response = ai_response.strip()
        if ai_response.startswith('```json'):
            ai_response = ai_response.replace('```json', '').replace('```', '').strip()
        
        try:
            dashboard_data = json.loads(ai_response)
        except json.JSONDecodeError as e:
            return jsonify({"error": f"Invalid JSON response from Perplexity AI: {str(e)}", "raw_response": ai_response}), 500
        
        # Validate the dashboard structure
        if not isinstance(dashboard_data, dict) or 'widgets' not in dashboard_data:
            return jsonify({"error": "Invalid dashboard structure from Perplexity AI"}), 500
        
        # Add metadata
        dashboard_data['generated_at'] = time.time()
        dashboard_data['data_source'] = 'CSV Data Analysis'
        dashboard_data['model_used'] = model
        dashboard_data['csv_filename'] = 'uploaded_data.csv'  # Could be enhanced to get actual filename
        
        # Validate each widget has the correct data structure
        for widget in dashboard_data.get('widgets', []):
            if widget.get('type') == 'number':
                if not isinstance(widget.get('data'), dict) or 'value' not in widget['data']:
                    # Provide fallback structure for number widgets
                    widget['data'] = {"value": 0, "label": "No data available"}
            elif widget.get('type') in ['bar', 'line']:
                if not isinstance(widget.get('data'), list):
                    # Provide fallback structure for chart widgets
                    widget['data'] = [{"name": "No data", "value": 0}]
            
            # Ensure source_url is set for CSV widgets
            if 'source_url' not in widget:
                widget['source_url'] = 'CSV Data Analysis'
        
        return jsonify({
            "success": True,
            "dashboard": dashboard_data,
            "message": "Dashboard generated from CSV data analysis"
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network error connecting to Perplexity API: {str(e)}"}), 500
    except KeyError as e:
        return jsonify({"error": f"Unexpected response format from Perplexity API: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/generate-single-widget', methods=['POST'])
def generate_single_widget():
    """
    Single widget generation endpoint for widget replacement:
    1. Gets prompt from frontend for a specific widget
    2. Uses Perplexity AI to research and generate data for just one widget
    3. Returns single widget data ready for replacement
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
        
        prompt = data['prompt']
        model = data.get('model', 'sonar-pro')
        widget_type = data.get('widget_type', 'auto')  # auto, bar, line, number
        csv_data = data.get('csv_data')  # Optional CSV data
        dashboard_context = data.get('dashboard_context', '')  # Dashboard context for maintaining topic
        
        if not prompt.strip():
            return jsonify({"error": "Empty prompt provided"}), 400
        
        # Check if API key is configured
        if not PERPLEXITY_API_KEY:
            return jsonify({"error": "Perplexity API key not configured"}), 500
        
        # Combine context with user prompt if context is available
        if dashboard_context and not csv_data:
            # For research-based widgets, prepend context to make the prompt more specific
            contextual_prompt = f"For the topic '{dashboard_context}', show me {prompt}"
        else:
            contextual_prompt = prompt
        
        # System prompt for single widget generation
        if csv_data:
            # CSV-based widget generation
            csv_preview = csv_data[:3000] if len(csv_data) > 3000 else csv_data
            context_instruction = f"The dashboard is about: {dashboard_context}. " if dashboard_context else ""
            system_prompt = f"""You are a data analyst AI that creates individual dashboard widgets from CSV data. You must respond ONLY with valid JSON on a single line without any newlines or formatting.

Here is the CSV data to analyze:
```
{csv_preview}
```

{context_instruction}Based on the CSV data above and the user's request, create a JSON object for a SINGLE widget with this exact structure:

{{"name": "Widget title", "type": "bar" | "line" | "number", "data": DATA_STRUCTURE, "source_url": "CSV Data Analysis"}}

DATA_STRUCTURE rules:
- For "bar" charts: [{{"name": "Category", "value": number}}, {{"name": "Category2", "value": number}}, ...]
- For "line" charts: [{{"name": "Period", "value": number}}, {{"name": "Period2", "value": number}}, ...]  
- For "number" widgets: {{"value": number, "label": "Description"}}

Guidelines:
- Create ONE widget that best answers the user's specific question
- Use actual data from the CSV provided
- {context_instruction}Focus on the specific aspect requested while maintaining relevance to the main topic
- Choose the most appropriate chart type for the requested data
- Make the widget name descriptive and specific
- Ensure all values are actual numbers from the CSV
- Return compact JSON without any newlines, spaces, or formatting

User's widget request: """
        else:
            # Regular research-based widget generation
            widget_type_hint = ""
            if widget_type != 'auto':
                widget_type_hint = f"Use widget type: {widget_type}. "
            
            context_instruction = f"This widget is for a dashboard about: {dashboard_context}. " if dashboard_context else ""
            system_prompt = f"""You are a data analyst AI that researches topics and creates individual dashboard widgets. You must respond ONLY with valid JSON on a single line without any newlines or formatting.

{context_instruction}Research the given topic thoroughly and return a JSON object for a SINGLE widget with this exact structure:

{{"name": "Widget title", "type": "bar" | "line" | "number", "data": DATA_STRUCTURE, "source_url": "URL where you found this specific data"}}

DATA_STRUCTURE rules:
- For "bar" charts: [{{"name": "Category", "value": number}}, {{"name": "Category2", "value": number}}, ...]
- For "line" charts: [{{"name": "Period", "value": number}}, {{"name": "Period2", "value": number}}, ...]  
- For "number" widgets: {{"value": number, "label": "Description"}}

Guidelines:
- Research the topic using current, factual information
- Create ONE widget that best represents the requested data
- Use real statistics, numbers, and data points
- {context_instruction}The user's request should be interpreted in the context of the main dashboard topic
- {widget_type_hint}Choose the most appropriate chart type for the data:
  * "bar" for comparisons, rankings, categories
  * "line" for trends over time, sequences
  * "number" for single key metrics, totals, records
- Include the "source_url" field with the actual URL where you found the data
- Make the widget name descriptive and specific to both the context and the request
- Ensure all values are actual numbers, not strings
- Include credible source URLs (official websites, news sources, databases)
- Return compact JSON without any newlines, spaces, or formatting

User's widget request: """
        
        full_prompt = system_prompt + contextual_prompt
        
        # Make request to Perplexity API
        headers = {
            'Authorization': f'Bearer {PERPLEXITY_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a data research assistant that provides factual, current information in structured JSON format for individual dashboard widgets."},
                {"role": "user", "content": full_prompt}
            ],
            'max_tokens': 1000,
            'temperature': 0.2
        }
        
        response = requests.post(
            f'{PERPLEXITY_BASE_URL}/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            return jsonify({"error": f"Perplexity API error: {response.status_code} - {response.text}"}), 500
        
        # Extract and parse the Perplexity response
        response_data = response.json()
        ai_response = response_data['choices'][0]['message']['content']
        
        # Clean up the response (remove markdown formatting if present)
        ai_response = ai_response.strip()
        if ai_response.startswith('```json'):
            ai_response = ai_response.replace('```json', '').replace('```', '').strip()
        
        try:
            widget_data = json.loads(ai_response)
        except json.JSONDecodeError as e:
            return jsonify({"error": f"Invalid JSON response from Perplexity AI: {str(e)}", "raw_response": ai_response}), 500
        
        # Validate the widget structure
        required_fields = ['name', 'type', 'data']
        if not isinstance(widget_data, dict) or not all(field in widget_data for field in required_fields):
            return jsonify({"error": "Invalid widget structure from Perplexity AI"}), 500
        
        # Validate data structure based on type
        widget_type = widget_data.get('type')
        if widget_type == 'number':
            if not isinstance(widget_data.get('data'), dict) or 'value' not in widget_data['data']:
                widget_data['data'] = {"value": 0, "label": "No data available"}
        elif widget_type in ['bar', 'line']:
            if not isinstance(widget_data.get('data'), list):
                widget_data['data'] = [{"name": "No data", "value": 0}]
        
        # Ensure source_url is present
        if 'source_url' not in widget_data:
            widget_data['source_url'] = 'CSV Data Analysis' if csv_data else 'AI Research'
        
        return jsonify({
            "success": True,
            "widget": widget_data,
            "message": "Single widget generated successfully"
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network error connecting to Perplexity API: {str(e)}"}), 500
    except KeyError as e:
        return jsonify({"error": f"Unexpected response format from Perplexity API: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000) 