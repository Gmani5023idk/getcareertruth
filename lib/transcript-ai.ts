import OpenAI from 'openai';

/**
 * AI-powered transcript processing utilities
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

/**
 * Generate a summary of a transcript
 */
export async function generateTranscriptSummary(transcript: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes career counseling conversations. Create a concise summary (2-3 paragraphs) that captures the main topics discussed, advice given, and action items.',
        },
        {
          role: 'user',
          content: `Please summarize this career counseling conversation:\n\n${transcript}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Error generating transcript summary:', error);
    throw new Error('Failed to generate summary');
  }
}

/**
 * Extract key points from a transcript
 */
export async function extractKeyPoints(transcript: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts key points from career counseling conversations. Extract 5-7 key points as a numbered list. Each point should be concise and actionable.',
        },
        {
          role: 'user',
          content: `Extract the key points from this career counseling conversation:\n\n${transcript}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';
    const points = content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((line) => line.length > 0);

    return points.slice(0, 7); // Limit to 7 key points
  } catch (error) {
    console.error('Error extracting key points:', error);
    throw new Error('Failed to extract key points');
  }
}

/**
 * Extract action items from a transcript
 */
export async function extractActionItems(transcript: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts action items from career counseling conversations. Extract specific tasks, deadlines, and follow-up items as a numbered list.',
        },
        {
          role: 'user',
          content: `Extract action items from this career counseling conversation:\n\n${transcript}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';
    const items = content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((line) => line.length > 0);

    return items.slice(0, 5); // Limit to 5 action items
  } catch (error) {
    console.error('Error extracting action items:', error);
    throw new Error('Failed to extract action items');
  }
}

/**
 * Analyze sentiment of a transcript
 */
export async function analyzeSentiment(transcript: string): Promise<{
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
  topics: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes the sentiment of career counseling conversations. Respond with a JSON object containing: overall sentiment (positive/neutral/negative), confidence score (0-1), and main topics discussed.',
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this career counseling conversation:\n\n${transcript}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(content);

    return {
      overall: analysis.overall || 'neutral',
      confidence: analysis.confidence || 0.5,
      topics: analysis.topics || [],
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw new Error('Failed to analyze sentiment');
  }
}

/**
 * Process a complete transcript with all AI features
 */
export async function processTranscript(transcript: string) {
  try {
    const [summary, keyPoints, actionItems, sentiment] = await Promise.all([
      generateTranscriptSummary(transcript),
      extractKeyPoints(transcript),
      extractActionItems(transcript),
      analyzeSentiment(transcript),
    ]);

    return {
      summary,
      keyPoints,
      actionItems,
      sentiment,
    };
  } catch (error) {
    console.error('Error processing transcript:', error);
    throw new Error('Failed to process transcript');
  }
}
