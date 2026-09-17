import { END, START, StateGraph, StateSchema } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import { MessageRole } from 'generated/prisma/enums';
import { z } from 'zod';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { decisionAgent, mainAgent } from './model';

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

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  private decideRoute = async (state: AgentStateType) => {
    const result = await decisionAgent.invoke({
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

    const result = await mainAgent.invoke({
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
    .addNode('generateAnswer', this.generateAnswer)
    .addEdge(START, 'decideRoute')
    .addConditionalEdges(
      'decideRoute',
      (state: AgentStateType) => (state.route === 'vectorSearch' ? 'searchKnowledge' : 'generateAnswer'),
      ['searchKnowledge', 'generateAnswer'],
    )
    .addEdge('searchKnowledge', 'generateAnswer')
    .addEdge('generateAnswer', END)
    .compile();

  async ask(input: string, conversationId?: string) {
    const resolvedConversationId =
      conversationId ?? (await this.prisma.conversation.create({ data: {} })).id;

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
}
