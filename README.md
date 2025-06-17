# Flask OpenAI API Backend

A simple Flask backend that accepts prompts and processes them through the OpenAI API.

## Features

- RESTful API endpoint for chat completions
- Support for different OpenAI models (GPT-3.5-turbo, GPT-4, etc.)
- Error handling for API rate limits and authentication issues
- CORS enabled for frontend integration
- Health check endpoint

## Setup

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure OpenAI API Key:**

   - Copy `config.example` to `.env`
   - Add your OpenAI API key:

   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

3. **Run the application:**
   ```bash
   python app.py
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check

- **GET** `/health`
- Returns server status

### Chat Completion

- **POST** `/chat`
- **Body:** JSON with `prompt` (required) and `model` (optional)
- **Example:**
  ```json
  {
    "prompt": "Explain quantum computing in simple terms",
    "model": "gpt-3.5-turbo"
  }
  ```

## Testing

Run the test script to verify everything works:

```bash
python test_api.py
```

## Example Usage

```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you today?"}'
```

## Requirements

- Python 3.7+
- OpenAI API key
- Flask and dependencies (see requirements.txt)
