import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";

export interface RAGSource {
  title: string;
  url?: string;
  score?: number;
}

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
}

let bedrockClient: BedrockAgentRuntimeClient | null = null;

function getBedrockClient(): BedrockAgentRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockAgentRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return bedrockClient;
}

export async function queryBedrock(userMessage: string): Promise<RAGResponse> {
  // Check if mock mode is enabled
  if (process.env.MOCK_KB === "true") {
    return getMockResponse(userMessage);
  }

  try {
    const client = getBedrockClient();
    const kbId = process.env.BEDROCK_KB_ID;
    const modelArn = process.env.BEDROCK_MODEL_ARN;

    if (!kbId || !modelArn) {
      console.error("Missing BEDROCK_KB_ID or BEDROCK_MODEL_ARN environment variables");
      return getMockResponse(userMessage);
    }

    const command = new RetrieveAndGenerateCommand({
      input: {
        text: userMessage,
      },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: kbId,
          modelArn: modelArn,
        },
      },
    });

    const response = await client.send(command);

    // Extract answer from response
    const answer = response.output?.text || "I could not generate a response.";

    // Extract sources/citations from retrieval results
    const sources: RAGSource[] = [];
    if (response.retrievalResults && response.retrievalResults.length > 0) {
      response.retrievalResults.forEach((result) => {
        if (result.location?.s3Location?.uri) {
          sources.push({
            title: extractFilenameFromS3Uri(result.location.s3Location.uri),
            url: result.location.s3Location.uri,
            score: result.score ? Math.round(result.score * 100) : undefined,
          });
        }
      });
    }

    return { answer, sources };
  } catch (error) {
    console.error("Bedrock API error:", error);
    // Fall back to mock on error
    return getMockResponse(userMessage);
  }
}

function getMockResponse(userMessage: string): RAGResponse {
  return {
    answer: `Based on your knowledge base, here's what I found regarding "${userMessage}":\n\nThis is a mock response demonstrating how the RAG system will work with your Bedrock Knowledge Base. When connected to real data sources, I'll provide accurate answers with proper citations from your documents.`,
    sources: [
      { title: "documentation.pdf", url: "#", score: 95 },
      { title: "knowledge_base.docx", url: "#", score: 87 },
    ],
  };
}

function extractFilenameFromS3Uri(uri: string): string {
  try {
    return uri.split("/").pop() || "Document";
  } catch {
    return "Document";
  }
}
