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
  const kbId = process.env.BEDROCK_KB_ID;
  const modelArn = process.env.BEDROCK_MODEL_ARN;
  const region = process.env.AWS_REGION;
  const mockMode = process.env.MOCK_KB;
  
  console.log("[Bedrock] Configuration check:");
  console.log("  - MOCK_KB:", mockMode);
  console.log("  - AWS_REGION:", region || "NOT SET");
  console.log("  - BEDROCK_KB_ID:", kbId ? `SET (${kbId.substring(0, 8)}...)` : "NOT SET");
  console.log("  - BEDROCK_MODEL_ARN:", modelArn ? "SET" : "NOT SET");
  console.log("  - AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "SET" : "NOT SET");
  console.log("  - AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "NOT SET");
  
  // Check if mock mode is enabled
  if (mockMode === "true") {
    console.log("[Bedrock] Using mock KB mode (MOCK_KB=true)");
    return getMockResponse(userMessage);
  }

  if (!kbId || !modelArn) {
    console.error("[Bedrock] Missing required environment variables - falling back to mock");
    return getMockResponse(userMessage);
  }

  try {
    const client = getBedrockClient();

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

    console.log("Sending Bedrock command with KB ID:", kbId);
    const response = await client.send(command);
    console.log("Bedrock response received successfully");

    // Extract answer from response
    const answer = response.output?.text || "I could not generate a response.";

    // Extract sources/citations from response
    const sources: RAGSource[] = [];
    if (response.citations && response.citations.length > 0) {
      console.log("Retrieved", response.citations.length, "citations from KB");
      response.citations.forEach((citation) => {
        citation.retrievedReferences?.forEach((ref) => {
          if (ref.location?.s3Location?.uri) {
            sources.push({
              title: extractFilenameFromS3Uri(ref.location.s3Location.uri),
              url: ref.location.s3Location.uri,
              score: undefined,
            });
          }
        });
      });
    } else {
      console.log("No citations in Bedrock response");
    }

    return { answer, sources };
  } catch (error) {
    console.error("Bedrock API error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    // Fall back to mock on error
    console.log("Falling back to mock response due to error");
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
