import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDb, jurisdictions } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

const SYSTEM_PROMPT = `You are PermitIQ's AI permit intelligence agent. You help construction project managers track and manage commercial building permits across multiple jurisdictions in the US.

When answering questions:
- Search official government sources (.gov domains), municipal permit portals, and building code databases
- Cite specific code sections, permit requirements, fees, and processing times by jurisdiction
- For permit status questions, check official jurisdiction portals (e.g., hcpid.org for Harris County, austintexas.gov for Austin)
- Include jurisdiction-specific processing times, required documents, and fee schedules when relevant
- Always cite your sources with numbered references at the end of your response

Format citations as:
CITATIONS:
1. [Source Name] - URL
2. [Source Name] - URL

Focus on practical, actionable information for commercial construction project managers.`;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { message, history } = await request.json() as {
      message: string;
      history: ConversationMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    // Look up any jurisdictions mentioned in the message and inject as context
    let jurisdictionContext = '';
    try {
      const db = getDb();
      const msgLower = message.toLowerCase();

      // Find all jurisdiction rows whose city name appears in the message
      const allJurs = await db.select({
        city: jurisdictions.city,
        state: jurisdictions.state,
        metro: jurisdictions.metro,
        ahjName: jurisdictions.ahjName,
        portalUrl: jurisdictions.portalUrl,
        phone: jurisdictions.phone,
        avgBuilding: jurisdictions.avgReviewDaysBuilding,
        avgElectrical: jurisdictions.avgReviewDaysElectrical,
        avgPlumbing: jurisdictions.avgReviewDaysPlumbing,
        avgMechanical: jurisdictions.avgReviewDaysMechanical,
        avgFire: jurisdictions.avgReviewDaysFire,
        notes: jurisdictions.notes,
      }).from(jurisdictions);

      const matched = allJurs.filter((j) =>
        msgLower.includes(j.city.toLowerCase()) ||
        msgLower.includes(j.metro.toLowerCase().replace(' metro', '')) ||
        (j.state && msgLower.includes(j.state.toLowerCase()))
      );

      // Deduplicate by city (in case multiple partial matches)
      const seen = new Set<string>();
      const unique = matched.filter((j) => {
        if (seen.has(j.city)) return false;
        seen.add(j.city);
        return true;
      }).slice(0, 3); // max 3 jurisdictions to avoid prompt bloat

      if (unique.length > 0) {
        jurisdictionContext = '\n\n--- PERMITIQ MARKET DATABASE (verified data) ---\n';
        jurisdictionContext += 'The following AHJ data is from PermitIQ\'s verified market database. Prefer this over web search for these jurisdictions:\n\n';
        for (const j of unique) {
          jurisdictionContext += `**${j.city}, ${j.state} — ${j.ahjName}**\n`;
          if (j.portalUrl) jurisdictionContext += `  Portal: ${j.portalUrl}\n`;
          if (j.phone) jurisdictionContext += `  Phone: ${j.phone}\n`;
          const avgLines = [
            j.avgBuilding != null ? `Building: ${j.avgBuilding}d` : null,
            j.avgElectrical != null ? `Electrical: ${j.avgElectrical}d` : null,
            j.avgPlumbing != null ? `Plumbing: ${j.avgPlumbing}d` : null,
            j.avgMechanical != null ? `Mechanical: ${j.avgMechanical}d` : null,
            j.avgFire != null ? `Fire: ${j.avgFire}d` : null,
          ].filter(Boolean);
          if (avgLines.length) jurisdictionContext += `  Avg review times: ${avgLines.join(', ')}\n`;
          if (j.notes) jurisdictionContext += `  AHJ notes: ${j.notes}\n`;
          jurisdictionContext += '\n';
        }
        jurisdictionContext += '--- END MARKET DATABASE ---';
      }
    } catch {
      // DB unavailable — proceed without context injection
    }

    const client = new Anthropic({ apiKey });

    // Build conversation history (last 10 messages to stay within context)
    const conversationMessages: Anthropic.MessageParam[] = [
      ...(history || []).slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT + jurisdictionContext,
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
        },
      ],
      messages: conversationMessages,
    });

    // Extract text content and citations from the response
    let responseText = '';
    const citations: string[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        responseText = block.text;
      } else if (block.type === 'web_search_tool_result') {
        // Extract URLs from web search results returned by the tool
        const results = (block as { type: string; content?: Array<{ type: string; url?: string }> }).content;
        if (Array.isArray(results)) {
          for (const result of results) {
            if (result.type === 'web_search_result' && result.url && !citations.includes(result.url)) {
              citations.push(result.url);
            }
          }
        }
      }
    }

    // Also parse any CITATIONS section the model wrote in its text response
    const citationMatch = responseText.match(/CITATIONS:\s*([\s\S]+?)$/im);
    if (citationMatch) {
      const citationLines = citationMatch[1].trim().split('\n');
      for (const line of citationLines) {
        const urlMatch = line.match(/https?:\/\/[^\s)]+/);
        if (urlMatch && !citations.includes(urlMatch[0])) {
          citations.push(urlMatch[0]);
        }
      }
      // Remove CITATIONS block from displayed text
      responseText = responseText.replace(/CITATIONS:\s*[\s\S]+$/im, '').trim();
    }

    return NextResponse.json({
      content: responseText,
      citations,
    });
  } catch (error) {
    console.error('Chat agent error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Surface API key errors clearly
    if (message.includes('API key') || message.includes('authentication')) {
      return NextResponse.json({ error: 'Invalid ANTHROPIC_API_KEY' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Agent request failed' }, { status: 500 });
  }
}
