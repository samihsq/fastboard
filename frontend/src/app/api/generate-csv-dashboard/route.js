import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data || !data.prompt || !data.csv_data) {
      return NextResponse.json({ error: "Both prompt and CSV data are required" }, { status: 400 });
    }
    
    const prompt = data.prompt;
    const csvData = data.csv_data;
    const model = data.model || 'sonar';
    
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Empty prompt provided" }, { status: 400 });
    }
    
    if (!csvData.trim()) {
      return NextResponse.json({ error: "Empty CSV data provided" }, { status: 400 });
    }
    
    // Check if API key is configured
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: "Perplexity API key not configured" }, { status: 500 });
    }
    
    // Limit CSV data size (first 5000 characters to avoid token limits)
    const csvPreview = csvData.length > 5000 ? csvData.substring(0, 5000) : csvData;
    
    // Enhanced system prompt for CSV analysis
    const systemPrompt = `You are a data analyst AI that analyzes CSV data and creates comprehensive dashboards. You must respond ONLY with valid JSON on a single line without any newlines or formatting.

Here is the CSV data to analyze:
\`\`\`
${csvPreview}
\`\`\`

Analyze this CSV data and return a JSON object with this exact structure:

{"dash_name": "Descriptive dashboard name", "category": "sports" | "business" | "entertainment" | "technology" | "science" | "finance" | "health" | "education" | "other", "widgets": [{"name": "Widget title", "type": "bar" | "line" | "number", "data": DATA_STRUCTURE, "source_url": "Data from CSV analysis"}]}

DATA_STRUCTURE rules:
- For "bar" charts: [{"name": "Category", "value": number}, {"name": "Category2", "value": number}, ...]
- For "line" charts: [{"name": "Period", "value": number}, {"name": "Period2", "value": number}, ...]  
- For "number" widgets: {"value": number, "label": "Description"}

Guidelines:
- Analyze the CSV data thoroughly to understand its structure and content
- Create 3-4 relevant widgets that best represent the insights from the data
- Use actual data from the CSV for all values
- Choose appropriate chart types based on the data:
  * "bar" for comparisons (categories, rankings, distributions)
  * "line" for trends over time (if time-based data exists)
  * "number" for key metrics (totals, averages, counts)
- Make widget names descriptive and specific to the data
- Ensure all values are actual numbers from the CSV data
- Include meaningful insights and patterns found in the data
- Return compact JSON without any newlines, spaces, or formatting

User question: `;
    
    const fullPrompt = systemPrompt + prompt;
    
    // Make request to Perplexity API
    const headers = {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const payload = {
      'model': model,
      'messages': [
        {"role": "system", "content": "You are a data analysis assistant that processes CSV data and provides insights in structured JSON format."},
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
    dashboardData.data_source = 'CSV Data Analysis';
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
      message: "Dashboard generated from CSV data analysis"
    });
    
  } catch (error) {
    console.error('Error in generate-csv-dashboard:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 