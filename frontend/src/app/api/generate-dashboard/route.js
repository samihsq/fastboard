import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: "generate-dashboard API endpoint is working",
    methods: ["POST"],
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  console.log('POST request received to /api/generate-dashboard');
  try {
    const data = await request.json();
    console.log('Request data:', data);
    
    if (!data || !data.prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }
    
    const prompt = data.prompt;
    const model = data.model || 'sonar';
    
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Empty prompt provided" }, { status: 400 });
    }
    
    // Check if API key is configured
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: "Perplexity API key not configured" }, { status: 500 });
    }
    
    // Enhanced system prompt for comprehensive data gathering
    const systemPrompt = `You are a data analyst AI that researches topics and creates comprehensive dashboards with real data. You must respond ONLY with valid JSON on a single line without any newlines or formatting.

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

User topic: `;
    
    const fullPrompt = systemPrompt + prompt;
    
    // Make request to Perplexity API
    const headers = {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const payload = {
      'model': model,
      'messages': [
        {"role": "system", "content": "You are a data research assistant that provides factual, current information in structured JSON format."},
        {"role": "user", "content": fullPrompt}
      ],
      'max_tokens': 2000,
      'temperature': 0.2
    };
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: `Perplexity API error: ${response.status} - ${errorText}` 
      }, { status: 500 });
    }
    
    // Extract and parse the Perplexity response
    const responseData = await response.json();
    let aiResponse = responseData.choices[0].message.content;
    
    // Clean up the response (remove markdown formatting if present)
    aiResponse = aiResponse.trim();
    if (aiResponse.startsWith('```json')) {
      aiResponse = aiResponse.replace('```json', '').replace('```', '').trim();
    }
    
    let dashboardData;
    try {
      dashboardData = JSON.parse(aiResponse);
    } catch (e) {
      return NextResponse.json({ 
        error: `Invalid JSON response from Perplexity AI: ${e.message}`, 
        raw_response: aiResponse 
      }, { status: 500 });
    }
    
    // Validate the dashboard structure
    if (!dashboardData || typeof dashboardData !== 'object' || !dashboardData.widgets) {
      return NextResponse.json({ error: "Invalid dashboard structure from Perplexity AI" }, { status: 500 });
    }
    
    // Add metadata
    dashboardData.generated_at = Date.now() / 1000;
    dashboardData.data_source = 'Perplexity AI Research';
    dashboardData.model_used = model;
    
    // Validate each widget has the correct data structure
    for (const widget of dashboardData.widgets || []) {
      if (widget.type === 'number') {
        if (!widget.data || typeof widget.data !== 'object' || !('value' in widget.data)) {
          // Provide fallback structure for number widgets
          widget.data = {"value": 0, "label": "No data available"};
        }
      } else if (['bar', 'line'].includes(widget.type)) {
        if (!Array.isArray(widget.data)) {
          // Provide fallback structure for chart widgets
          widget.data = [{"name": "No data", "value": 0}];
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      dashboard: dashboardData,
      message: "Dashboard generated with real-time research data"
    });
    
  } catch (error) {
    console.error('Error in generate-dashboard:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 