import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data || !data.prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }
    
    const prompt = data.prompt;
    const widgetType = data.widget_type || 'auto';
    const dashboardContext = data.dashboard_context || '';
    const csvData = data.csv_data || '';
    const model = data.model || 'sonar';
    
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Empty prompt provided" }, { status: 400 });
    }
    
    // Check if API key is configured
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: "Perplexity API key not configured" }, { status: 500 });
    }
    
    // Build context for the widget generation
    let contextInfo = '';
    if (dashboardContext) {
      contextInfo += `Dashboard context: ${dashboardContext}\n`;
    }
    if (csvData) {
      const csvPreview = csvData.length > 3000 ? csvData.substring(0, 3000) : csvData;
      contextInfo += `CSV data available:\n\`\`\`\n${csvPreview}\n\`\`\`\n`;
    }
    
    // Enhanced system prompt for single widget generation
    const systemPrompt = `You are a data analyst AI that creates single widgets for dashboards. You must respond ONLY with valid JSON on a single line without any newlines or formatting.

${contextInfo}

Create a single widget based on the user's request and return a JSON object with this exact structure:

{"name": "Widget title", "type": "bar" | "line" | "number", "data": DATA_STRUCTURE, "source_url": "URL or data source"}

DATA_STRUCTURE rules:
- For "bar" charts: [{"name": "Category", "value": number}, {"name": "Category2", "value": number}, ...]
- For "line" charts: [{"name": "Period", "value": number}, {"name": "Period2", "value": number}, ...]  
- For "number" widgets: {"value": number, "label": "Description"}

Guidelines:
- Research the topic thoroughly to provide accurate, current data
- Choose the most appropriate chart type based on the data:
  * "bar" for comparisons (stats, rankings, categories)
  * "line" for trends over time (years, seasons, periods)
  * "number" for single key metrics (totals, averages, records)
- Use real statistics, numbers, and data points
- Make the widget name descriptive and specific
- Ensure all values are actual numbers, not strings
- Include a credible source URL where you found the data
- If CSV data is provided, analyze it and use that data
- Consider the dashboard context when creating the widget
- Return compact JSON without any newlines, spaces, or formatting

User request: `;
    
    const fullPrompt = systemPrompt + prompt;
    
    // Make request to Perplexity API
    const headers = {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const payload = {
      'model': model,
      'messages': [
        {"role": "system", "content": "You are a data research assistant that creates single widgets with factual, current information in structured JSON format."},
        {"role": "user", "content": fullPrompt}
      ],
      'max_tokens': 1500,
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
    
    let widgetData;
    try {
      widgetData = JSON.parse(aiResponse);
    } catch (e) {
      return NextResponse.json({ 
        error: `Invalid JSON response from Perplexity AI: ${e.message}`, 
        raw_response: aiResponse 
      }, { status: 500 });
    }
    
    // Validate the widget structure
    if (!widgetData || typeof widgetData !== 'object' || !widgetData.name || !widgetData.type || !widgetData.data) {
      return NextResponse.json({ error: "Invalid widget structure from Perplexity AI" }, { status: 500 });
    }
    
    // Validate the data structure based on widget type
    if (widgetData.type === 'number') {
      if (!widgetData.data || typeof widgetData.data !== 'object' || !('value' in widgetData.data)) {
        // Provide fallback structure for number widgets
        widgetData.data = {"value": 0, "label": "No data available"};
      }
    } else if (['bar', 'line'].includes(widgetData.type)) {
      if (!Array.isArray(widgetData.data)) {
        // Provide fallback structure for chart widgets
        widgetData.data = [{"name": "No data", "value": 0}];
      }
    } else {
      return NextResponse.json({ error: "Invalid widget type" }, { status: 500 });
    }
    
    // Add metadata
    widgetData.generated_at = Date.now() / 1000;
    widgetData.data_source = csvData ? 'CSV Data Analysis' : 'Perplexity AI Research';
    widgetData.model_used = model;
    
    return NextResponse.json({
      success: true,
      widget: widgetData,
      message: "Widget generated successfully"
    });
    
  } catch (error) {
    console.error('Error in generate-single-widget:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 