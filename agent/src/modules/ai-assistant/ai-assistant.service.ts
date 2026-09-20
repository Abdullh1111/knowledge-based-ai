import { END, START, StateGraph, StateSchema } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import { MessageRole } from 'generated/prisma/enums';
import { z } from 'zod';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { getDecisionAgent, getMainAgent } from './model';

interface KnowledgeChunk {
  content: string;
}

const AgentState = new StateSchema({
  input: z.string(),
  conversationId: z.string().optional(),
  route: z.enum(['vectorSearch', 'directLLM']).optional(),
  context: z.string().default(''),
  output: z.string().default(''),
});

type AgentStateType = typeof AgentState.State;

/** Node whose token stream is shown to the user; other nodes (e.g. routing) stay internal. */
const ANSWER_NODE = 'generateAnswer';

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  private decideRoute = async (state: AgentStateType) => {
    const result = await getDecisionAgent().invoke({
      messages: [{ role: 'user', content: state.input }],
    });

    return { route: result.structuredResponse.action };
  };

  private searchKnowledge = async (state: AgentStateType) => {
    const chunks = (await this.filesService.search(
      state.input,
      state.conversationId,
    )) as KnowledgeChunk[];

    return { context: chunks.map((chunk) => chunk.content).join('\n\n') };
  };

  private generateAnswer = async (state: AgentStateType) => {
    const prompt = state.context
      ? `Use the following context to answer the question.\n\nContext:\n${state.context}\n\nQuestion: ${state.input}`
      : state.input;

    const result = await getMainAgent().invoke({
      messages: [{ role: 'user', content: prompt }],
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const output =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return { output };
  };

  private graph = new StateGraph(AgentState)
    .addNode('decideRoute', this.decideRoute)
    .addNode('searchKnowledge', this.searchKnowledge)
    .addNode(ANSWER_NODE, this.generateAnswer)
    .addEdge(START, 'decideRoute')
    .addConditionalEdges(
      'decideRoute',
      (state: AgentStateType) => (state.route === 'vectorSearch' ? 'searchKnowledge' : ANSWER_NODE),
      ['searchKnowledge', ANSWER_NODE],
    )
    .addEdge('searchKnowledge', ANSWER_NODE)
    .addEdge(ANSWER_NODE, END)
    .compile();

  private async resolveConversationId(input: string, conversationId?: string) {
    if (conversationId) return conversationId;

    const conversation = await this.prisma.conversation.create({
      data: { name: input.slice(0, 60) },
    });
    return conversation.id;
  }

  async ask(input: string, conversationId?: string) {
    const resolvedConversationId = await this.resolveConversationId(input, conversationId);

    await this.prisma.message.create({
      data: { content: input, role: MessageRole.USER, conversationId: resolvedConversationId },
    });

    const result = await this.graph.invoke({
      input,
      conversationId: resolvedConversationId,
    });

    await this.prisma.message.create({
      data: {
        content: result.output,
        role: MessageRole.ASSISTANT,
        conversationId: resolvedConversationId,
      },
    });

    return {
      conversationId: resolvedConversationId,
      route: result.route,
      output: result.output,
    };
  }

  /**
   * Same graph as `ask`, but streamed: `streamMode: ["messages", "values"]` gives
   * per-token chat-model chunks (tagged with the node that produced them via
   * `checkpoint_ns`) alongside full-state snapshots. Only tokens from the
   * `generateAnswer` node are forwarded — the routing agent's tokens stay internal.
   */
  async askStream(
    input: string,
    conversationId: string | undefined,
    onToken: (token: string) => void,
  ) {
    const resolvedConversationId = await this.resolveConversationId(input, conversationId);

    await this.prisma.message.create({
      data: { content: input, role: MessageRole.USER, conversationId: resolvedConversationId },
    });

    const stream = await this.graph.stream(
      { input, conversationId: resolvedConversationId },
      { streamMode: ['messages', 'values'] },
    );

    let finalState: AgentStateType | undefined;

    for await (const [mode, payload] of stream) {
      if (mode === 'values') {
        finalState = payload;
        continue;
      }

      const [chunk, metadata] = payload;
      if (!(metadata.checkpoint_ns as string | undefined)?.startsWith(ANSWER_NODE)) continue;

      if (typeof chunk.content === 'string' && chunk.content) {
        onToken(chunk.content);
      }
    }

    const output = finalState?.output ?? '';

    await this.prisma.message.create({
      data: { content: output, role: MessageRole.ASSISTANT, conversationId: resolvedConversationId },
    });

    return { conversationId: resolvedConversationId, route: finalState?.route, output };
  }
}
